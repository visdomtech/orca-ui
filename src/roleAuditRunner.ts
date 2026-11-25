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

/** A fetch that adds the app's auth (cookies / bearer token). Resolves on any status. */
export type RoleAuditFetch = (path: string, init?: RequestInit) => Promise<Response>;

export type RoleAuditRunner = (
  subjects: AuditSubject[],
  roles: { code: string; label: string }[],
  criteria: AuditCriteria,
  signal?: AbortSignal
) => Promise<RoleAuditResult>;

const RUN_PATH = "/orcaagents/app/run";

function extractText(event: unknown): string {
  if (typeof event === "string") return event;
  if (!event || typeof event !== "object") return "";
  const e = event as Record<string, unknown>;
  if (typeof e.text === "string") return e.text;
  if (typeof e.delta === "string") return e.delta;
  if (typeof e.output === "string") return e.output;
  if (typeof e.message === "string") return e.message;
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

/** Final (non-partial) agent text, ignoring the echoed user message. */
function extractTextFromAgentEvents(events: unknown[]): string {
  return events
    .filter((e) => {
      if (!e || typeof e !== "object") return true;
      const ev = e as Record<string, unknown>;
      return ev.partial !== true && ev.author !== "user";
    })
    .map(extractText)
    .join("");
}

/**
 * Builds the `auditRoles` callback for UsersAccess.
 *
 * @param fetchImpl the app's authenticated fetch (e.g. its `orcaFetch`).
 *   Defaults to `fetch` with `credentials: "include"`.
 */
export function createRoleAuditRunner(fetchImpl?: RoleAuditFetch): RoleAuditRunner {
  const doFetch: RoleAuditFetch =
    fetchImpl ?? ((path, init) => fetch(path, { credentials: "include", ...init }));

  return async (subjects, roles, criteria, signal) => {
    const response = await doFetch(RUN_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentName: "role-audit",
        message: buildRoleAuditPrompt(subjects, roles, criteria),
      }),
      signal,
    });

    if (!response.ok) {
      if (response.status === 404)
        throw new Error('The "role-audit" agent is not configured on this backend.');
      throw new Error(`Audit request failed: HTTP ${response.status}`);
    }
    if (!response.body) throw new Error("No response body from audit agent.");

    const events: unknown[] = [];
    const decoder = new TextDecoder();
    let buffer = "";
    let pendingEventType = "message";
    let streamDone = false;
    const reader = response.body.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed === "") {
            pendingEventType = "message";
            continue;
          }
          if (trimmed.startsWith("event:")) {
            pendingEventType = trimmed.slice(6).trim();
            continue;
          }
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") {
            streamDone = true;
            return parseRoleAuditResult(extractTextFromAgentEvents(events), subjects, roles);
          }
          let parsed: unknown = data;
          try {
            parsed = JSON.parse(data);
          } catch {
            /* keep the raw string */
          }
          if (pendingEventType === "error") {
            const msg =
              parsed && typeof parsed === "object"
                ? (parsed as Record<string, unknown>).error
                : undefined;
            throw new Error(typeof msg === "string" ? msg : "Audit agent returned an error.");
          }
          events.push(parsed);
        }
      }
    } finally {
      if (!streamDone) await reader.cancel().catch(() => undefined);
    }
    throw new Error("Audit stream ended without a completion signal.");
  };
}
