// Runs the backend "role-audit" agent over SSE and parses its verdict — the
// `auditRoles` callback UsersAccess needs for its Audit Roles tab. Shared so
// every sub-app gets the same tab without copying the streaming code.

import {
  buildRoleAuditPrompt,
  parseRoleAuditResult,
  type AuditCriteria,
  type AuditSubject,
  type RoleAuditResult,
} from "./roleAuditPrompt";

/**
 * A fetch that adds the app's auth (cookies / bearer token), plus anything else
 * the host needs on every request (API base-path prefix, CSRF header).
 * Must resolve on any HTTP status, and must let an aborted request reject with
 * the original `AbortError` (UsersAccess relies on its name to show the
 * timeout message).
 */
export type RoleAuditFetch = (path: string, init?: RequestInit) => Promise<Response>;

/** The shape of UsersAccess's `auditRoles` prop. */
export type RoleAuditRunner = (
  subjects: AuditSubject[],
  roles: { code: string; label: string }[],
  criteria: AuditCriteria,
  signal?: AbortSignal
) => Promise<RoleAuditResult>;

const AGENT_NAME = "role-audit";
const RUN_PATH = "/orcaagents/app/run";
const AGENTS_PATH = "/orcaagents/app/agents";
const ERROR_BODY_MAX = 200;
const AGENT_ERROR_MAX = 300;
const RAW_TEXT_CAUSE_MAX = 2000;

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function resolveFetch(fetchImpl?: RoleAuditFetch): RoleAuditFetch {
  return fetchImpl ?? ((path, init) => fetch(path, { credentials: "include", ...init }));
}

function extractText(event: unknown): string {
  if (typeof event === "string") return event;
  if (!event || typeof event !== "object") return "";
  const e = event as Record<string, unknown>;
  if (typeof e.text === "string") return e.text;
  if (typeof e.delta === "string") return e.delta;
  if (typeof e.output === "string") return e.output;
  const parts = (e.content as Record<string, unknown> | undefined)?.parts;
  if (Array.isArray(parts)) {
    return parts
      .map((p) =>
        p && typeof p === "object" && typeof (p as Record<string, unknown>).text === "string"
          ? ((p as Record<string, unknown>).text as string)
          : ""
      )
      .join("");
  }
  return "";
}

/** Final (non-partial) agent output — not a streaming partial or the echoed user message. */
function isFinalAgentOutput(event: unknown): boolean {
  if (!event || typeof event !== "object") return true;
  const e = event as Record<string, unknown>;
  return e.partial !== true && e.author !== "user";
}

/** The `title` of an RFC 9457 problem+json body (e.g. "Internal Server Error"), if any. */
function problemTitle(body: string): string | undefined {
  try {
    const title = (JSON.parse(body) as Record<string, unknown> | null)?.title;
    return typeof title === "string" && title.trim() ? truncate(title.trim(), 80) : undefined;
  } catch {
    return undefined;
  }
}

function agentErrorMessage(parsed: unknown): string {
  const msg =
    parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>).error : undefined;
  return typeof msg === "string" && msg.trim()
    ? truncate(msg, AGENT_ERROR_MAX)
    : "Audit agent returned an error.";
}

/**
 * Builds the `auditRoles` callback for UsersAccess. Create it once (module
 * scope or `useMemo`), not inline in render.
 *
 * Each call POSTs the audit prompt to `/orcaagents/app/run` (agent
 * `"role-audit"`) and reads the SSE stream until `data: [DONE]`.
 *
 * Gate the Audit tab on {@link checkRoleAuditAvailable}: pass the runner as
 * `auditRoles` only when it resolves `true`, otherwise users get a Run button
 * that fails with a 404.
 *
 * @param fetchImpl the app's authenticated fetch (e.g. its `orcaFetch`).
 *   Defaults to `fetch` with `credentials: "include"`.
 * @throws on a non-2xx response (the response body, truncated, is the error's
 *   `cause`), an agent `error` event, a stream that ends
 *   without `[DONE]`, or a verdict that doesn't parse (the raw agent text,
 *   truncated, is the error's `cause`). An abort rejects with the `AbortError`.
 */
export function createRoleAuditRunner(fetchImpl?: RoleAuditFetch): RoleAuditRunner {
  const doFetch = resolveFetch(fetchImpl);

  return async (subjects, roles, criteria, signal) => {
    const response = await doFetch(RUN_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentName: AGENT_NAME,
        message: buildRoleAuditPrompt(subjects, roles, criteria),
      }),
      signal,
    });

    if (!response.ok) {
      if (response.status === 404)
        throw new Error(`The "${AGENT_NAME}" agent is not registered on this backend.`);
      const body = (
        await response.text().catch((err: unknown) => {
          if (signal?.aborted) throw err; // keep the AbortError for the timeout message
          return "";
        })
      ).trim();
      // The body can carry raw backend errors (internal paths, proxy HTML), so it
      // goes in `cause` for debugging; the UI-facing message keeps only a title.
      const title = problemTitle(body);
      throw new Error(`Audit request failed: HTTP ${response.status}${title ? ` (${title})` : ""}`, {
        cause: body ? truncate(body, ERROR_BODY_MAX) : undefined,
      });
    }
    if (!response.body) throw new Error("No response body from audit agent.");

    const texts: string[] = [];
    let eventType = "message";
    let dataLines: string[] = [];

    /** Dispatches the buffered SSE event. Returns true on `[DONE]`. */
    const dispatch = (): boolean => {
      const type = eventType;
      const data = dataLines.join("\n");
      eventType = "message";
      dataLines = [];
      if (data === "") return false;
      if (data === "[DONE]") return true;
      let parsed: unknown = data;
      try {
        parsed = JSON.parse(data);
      } catch {
        /* keep the raw string */
      }
      if (type === "error") throw new Error(agentErrorMessage(parsed));
      if (type === "message" && isFinalAgentOutput(parsed)) texts.push(extractText(parsed));
      return false;
    };

    /** Feeds one SSE line. Returns true once `[DONE]` has been dispatched. */
    const feedLine = (line: string): boolean => {
      // Trimming is looser than the spec's single optional space after "data:",
      // which is fine for this backend's one-JSON-object-per-line frames.
      const trimmed = line.trim();
      if (trimmed === "") return dispatch();
      if (trimmed.startsWith("event:")) eventType = trimmed.slice(6).trim();
      else if (trimmed.startsWith("data:")) dataLines.push(trimmed.slice(5).trim());
      return false;
    };

    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let buffer = "";
    let completed = false;

    try {
      for (;;) {
        const { done, value } = await reader.read();
        buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // At end of stream the tail is a complete line; flush it and the pending event.
        buffer = done ? "" : (lines.pop() ?? "");
        if (done) lines.push("");
        for (const line of lines) {
          if (feedLine(line)) {
            completed = true;
            break;
          }
        }
        if (completed || done) break;
      }
    } finally {
      // Release the connection whether we finished, failed, or were aborted. Not
      // awaited: a custom stream whose cancel() never settles mustn't hang the audit.
      void reader.cancel().catch(() => undefined);
    }

    if (!completed) throw new Error("Audit stream ended without a completion signal.");
    const rawText = texts.join("");
    try {
      return parseRoleAuditResult(rawText, subjects, roles);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Could not parse the audit result.", {
        cause: truncate(rawText, RAW_TEXT_CAUSE_MAX),
      });
    }
  };
}

/**
 * Whether the backend has the `"role-audit"` agent registered
 * (GET `/orcaagents/app/agents`). Resolves `false` on any failure, including
 * an abort, so it is safe to gate the Audit tab on directly.
 */
export async function checkRoleAuditAvailable(
  fetchImpl?: RoleAuditFetch,
  signal?: AbortSignal
): Promise<boolean> {
  try {
    const res = await resolveFetch(fetchImpl)(AGENTS_PATH, { signal });
    if (!res.ok) return false;
    const agents: unknown = await res.json();
    return (
      Array.isArray(agents) &&
      agents.some(
        (a) => !!a && typeof a === "object" && (a as Record<string, unknown>).name === AGENT_NAME
      )
    );
  } catch {
    return false;
  }
}
