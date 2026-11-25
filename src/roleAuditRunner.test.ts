import { afterEach, describe, expect, it, vi } from "vitest";

import { buildRoleAuditPrompt, DEFAULT_AUDIT_CRITERIA, type AuditSubject } from "./roleAuditPrompt";
import { checkRoleAuditAvailable, createRoleAuditRunner } from "./roleAuditRunner";

const roles = [
  { code: "HR_LEAD", label: "HR Lead" },
  { code: "NONE", label: "No Access" },
];

const subjects: AuditSubject[] = [
  {
    id: "E1",
    name: "Ada Lovelace",
    title: "HR Business Partner",
    jobFamily: "HR",
    jobLevel: "L5",
    department: "People",
    function: "HR",
    location: "London",
    employmentType: "Full-time",
    hireDate: "2020-01-01",
    role: "NONE",
  },
];

const verdict = JSON.stringify({ summary: "All good", findings: [] });
const frame = (data: unknown, event?: string) =>
  `${event ? `event: ${event}\n` : ""}data: ${typeof data === "string" ? data : JSON.stringify(data)}\n\n`;
const DONE = "data: [DONE]\n\n";

/** A streamed SSE response, one chunk per string. Exposes whether the reader was cancelled. */
function sse(chunks: string[], status = 200) {
  const encoder = new TextEncoder();
  const state = { cancelled: false };
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
    cancel() {
      state.cancelled = true;
    },
  });
  return { response: new Response(body, { status }), state };
}

const runWith = (chunks: string[]) =>
  createRoleAuditRunner(vi.fn().mockResolvedValue(sse(chunks).response))(
    subjects,
    roles,
    DEFAULT_AUDIT_CRITERIA
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createRoleAuditRunner", () => {
  it("posts the prompt to the role-audit agent and parses the final text", async () => {
    const line = frame({ text: verdict });
    const fetchImpl = vi.fn().mockResolvedValue(
      sse([
        frame({ author: "user", text: "ignored" }),
        frame({ partial: true, text: "ignored" }),
        // A frame split across two chunks still parses.
        line.slice(0, 10),
        line.slice(10),
        DONE,
      ]).response
    );

    const result = await createRoleAuditRunner(fetchImpl)(subjects, roles, DEFAULT_AUDIT_CRITERIA);

    expect(result).toEqual({ summary: "All good", findings: [] });
    const [path, init] = fetchImpl.mock.calls[0];
    expect(path).toBe("/orcaagents/app/run");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body.agentName).toBe("role-audit");
    expect(body.message).toBe(buildRoleAuditPrompt(subjects, roles, DEFAULT_AUDIT_CRITERIA));
  });

  it("accepts [DONE] in the final chunk without a trailing newline", async () => {
    await expect(runWith([frame({ text: verdict }), "data: [DONE]"])).resolves.toEqual({
      summary: "All good",
      findings: [],
    });
  });

  it("ignores non-message events and status messages", async () => {
    await expect(
      runWith([
        frame({ message: "Starting {audit}" }),
        frame({ text: "{ping" }, "ping"),
        frame({ text: verdict }),
        DONE,
      ])
    ).resolves.toEqual({ summary: "All good", findings: [] });
  });

  it("joins a multi-line data field", async () => {
    const [first, second] = [JSON.stringify({ text: verdict }).slice(0, 8), JSON.stringify({ text: verdict }).slice(8)];
    await expect(runWith([`data: ${first}\ndata: ${second}\n\n`, DONE])).resolves.toEqual({
      summary: "All good",
      findings: [],
    });
  });

  it("handles \\r\\n line endings", async () => {
    await expect(
      runWith([`data: ${JSON.stringify({ text: verdict })}\r\n\r\n`, "data: [DONE]\r\n\r\n"])
    ).resolves.toEqual({ summary: "All good", findings: [] });
  });

  it.each([
    ["delta", { delta: verdict }],
    ["output", { output: verdict }],
    ["content.parts", { content: { parts: [{ text: verdict.slice(0, 5) }, { text: verdict.slice(5) }] } }],
  ])("extracts text from %s", async (_name, event) => {
    await expect(runWith([frame(event), DONE])).resolves.toEqual({ summary: "All good", findings: [] });
  });

  it("explains a missing agent", async () => {
    const run = createRoleAuditRunner(vi.fn().mockResolvedValue(new Response("", { status: 404 })));
    await expect(run([], roles, DEFAULT_AUDIT_CRITERIA)).rejects.toThrow(/not registered/);
  });

  it("includes status and a body snippet for other HTTP failures", async () => {
    const run = createRoleAuditRunner(
      vi.fn().mockResolvedValue(new Response(`upstream timeout ${"x".repeat(500)}`, { status: 502 }))
    );
    const err = await run([], roles, DEFAULT_AUDIT_CRITERIA).catch((e: Error) => e);
    expect((err as Error).message).toMatch(/^Audit request failed: HTTP 502 — upstream timeout x+…$/);
    expect((err as Error).message.length).toBeLessThan(260);
  });

  it("rejects when the response has no body", async () => {
    const run = createRoleAuditRunner(vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
    await expect(run([], roles, DEFAULT_AUDIT_CRITERIA)).rejects.toThrow(/No response body/);
  });

  it("surfaces an error event from the agent, truncated", async () => {
    await expect(runWith([frame({ error: "boom" }, "error")])).rejects.toThrow("boom");
    const err = await runWith([frame({ error: "e".repeat(1000) }, "error")]).catch((e: Error) => e);
    expect((err as Error).message.length).toBeLessThanOrEqual(301);
  });

  it("falls back to a generic message for a non-JSON error event", async () => {
    await expect(runWith([frame("not json", "error")])).rejects.toThrow("Audit agent returned an error.");
  });

  it("resets the event type after each event", async () => {
    await expect(
      runWith(["event: error\n\n", frame({ text: verdict }), DONE])
    ).resolves.toEqual({ summary: "All good", findings: [] });
  });

  it("fails when the stream ends without [DONE]", async () => {
    await expect(runWith([frame({ text: "x" })])).rejects.toThrow(/completion signal/);
  });

  it("attaches the raw agent text when the verdict doesn't parse", async () => {
    const err = await runWith([frame({ text: "no json here" }), DONE]).catch((e: Error) => e);
    expect((err as Error).message).toMatch(/recognizable result/);
    expect((err as Error).cause).toBe("no json here");
  });

  it("cancels the reader after [DONE]", async () => {
    const { response, state } = sse([frame({ text: verdict }), DONE, frame({ text: "late" })]);
    await createRoleAuditRunner(vi.fn().mockResolvedValue(response))(subjects, roles, DEFAULT_AUDIT_CRITERIA);
    expect(state.cancelled).toBe(true);
  });

  it("propagates an abort mid-stream as AbortError", async () => {
    const controller = new AbortController();
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new TextEncoder().encode(frame({ partial: true, text: "…" })));
        controller.signal.addEventListener("abort", () =>
          c.error(new DOMException("The operation was aborted.", "AbortError"))
        );
      },
    });
    const run = createRoleAuditRunner(vi.fn().mockResolvedValue(new Response(body)));
    const pending = run(subjects, roles, DEFAULT_AUDIT_CRITERIA, controller.signal);
    setTimeout(() => controller.abort(), 0);
    const err = await pending.catch((e: Error) => e);
    // Cancelling the errored stream in `finally` rejects; the runner swallows that
    // and keeps the original AbortError, which UsersAccess maps to its timeout message.
    expect((err as Error).name).toBe("AbortError");
  });

  it("defaults to fetch with credentials: include and forwards the signal", async () => {
    const fetchMock = vi.fn().mockResolvedValue(sse([frame({ text: verdict }), DONE]).response);
    vi.stubGlobal("fetch", fetchMock);
    const signal = new AbortController().signal;
    await createRoleAuditRunner()(subjects, roles, DEFAULT_AUDIT_CRITERIA, signal);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.credentials).toBe("include");
    expect(init.signal).toBe(signal);
  });
});

describe("checkRoleAuditAvailable", () => {
  const json = (data: unknown, status = 200) =>
    vi.fn().mockResolvedValue(new Response(JSON.stringify(data), { status }));

  it("is true when the role-audit agent is listed", async () => {
    const fetchImpl = json([{ name: "chat" }, { name: "role-audit" }]);
    await expect(checkRoleAuditAvailable(fetchImpl)).resolves.toBe(true);
    expect(fetchImpl.mock.calls[0][0]).toBe("/orcaagents/app/agents");
  });

  it("is false when the agent is not listed", async () => {
    await expect(checkRoleAuditAvailable(json([{ name: "chat" }]))).resolves.toBe(false);
  });

  it("is false on an HTTP error, a non-array body, or a rejected fetch", async () => {
    await expect(checkRoleAuditAvailable(json([], 500))).resolves.toBe(false);
    await expect(checkRoleAuditAvailable(json({ name: "role-audit" }))).resolves.toBe(false);
    await expect(checkRoleAuditAvailable(vi.fn().mockRejectedValue(new Error("offline")))).resolves.toBe(false);
  });
});
