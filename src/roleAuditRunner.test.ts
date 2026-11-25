import { describe, expect, it, vi } from "vitest";

import { DEFAULT_AUDIT_CRITERIA } from "./roleAuditPrompt";
import { createRoleAuditRunner } from "./roleAuditRunner";

const roles = [
  { code: "HR_LEAD", label: "HR Lead" },
  { code: "NONE", label: "No Access" },
];

/** A streamed SSE response, one chunk per string. */
function sse(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
  return new Response(body, { status });
}

describe("createRoleAuditRunner", () => {
  it("posts the prompt to the role-audit agent and parses the final text", async () => {
    const verdict = JSON.stringify({ summary: "All good", findings: [] });
    const fetchImpl = vi.fn().mockResolvedValue(
      sse([
        `data: ${JSON.stringify({ author: "user", text: "ignored" })}\n`,
        `data: ${JSON.stringify({ partial: true, text: "ignored" })}\n`,
        // A JSON line split across two chunks still parses.
        `data: ${JSON.stringify({ text: verdict }).slice(0, 10)}`,
        `${JSON.stringify({ text: verdict }).slice(10)}\n`,
        "data: [DONE]\n",
      ])
    );

    const result = await createRoleAuditRunner(fetchImpl)([], roles, DEFAULT_AUDIT_CRITERIA);

    expect(result).toEqual({ summary: "All good", findings: [] });
    const [path, init] = fetchImpl.mock.calls[0];
    expect(path).toBe("/orcaagents/app/run");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body).agentName).toBe("role-audit");
  });

  it("explains a missing agent", async () => {
    const run = createRoleAuditRunner(vi.fn().mockResolvedValue(new Response("", { status: 404 })));
    await expect(run([], roles, DEFAULT_AUDIT_CRITERIA)).rejects.toThrow(/not configured/);
  });

  it("surfaces an error event from the agent", async () => {
    const run = createRoleAuditRunner(
      vi.fn().mockResolvedValue(sse(["event: error\n", `data: ${JSON.stringify({ error: "boom" })}\n`]))
    );
    await expect(run([], roles, DEFAULT_AUDIT_CRITERIA)).rejects.toThrow("boom");
  });

  it("fails when the stream ends without [DONE]", async () => {
    const run = createRoleAuditRunner(vi.fn().mockResolvedValue(sse([`data: {"text":"x"}\n`])));
    await expect(run([], roles, DEFAULT_AUDIT_CRITERIA)).rejects.toThrow(/completion signal/);
  });
});
