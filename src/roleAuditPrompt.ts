export const toStr = (v: unknown): string => (typeof v === "string" ? v : "");

export function sanitizeProfileField(raw: string, maxLen = 100): string {
  return raw
    .replace(/[\r\n\t]/g, " ")
    .replace(/[|｜¦∣∥]/g, "/")
    .replace(/["'`]/g, "'")
    .replace(/<<<|>>>/g, "")
    .trim()
    .slice(0, maxLen);
}

export interface AuditSubject {
  id: string;
  name: string;
  title: string;
  jobFamily: string;
  jobLevel: string;
  department: string;
  function: string;
  location: string;
  employmentType: string;
  hireDate: string;
  role: string;
}

export interface AuditCriteria {
  compareTitles: boolean;
  comparePeers: boolean;
  flagNoAccess: boolean;
  customInstructions: string;
}

export const DEFAULT_AUDIT_CRITERIA: AuditCriteria = Object.freeze({
  compareTitles: true,
  comparePeers: true,
  flagNoAccess: true,
  customInstructions: "",
});

export type RoleAuditConcern = "OVER_PRIVILEGED" | "UNDER_PRIVILEGED" | "UNUSUAL_FOR_TITLE";

export const CONCERN_VALUES: RoleAuditConcern[] = [
  "OVER_PRIVILEGED",
  "UNDER_PRIVILEGED",
  "UNUSUAL_FOR_TITLE",
];

export interface RoleAuditFinding {
  employeeId: string;
  employeeName: string;
  title: string;
  currentRole: string;
  concern: RoleAuditConcern;
  suggestedRole?: string;
  rationale: string;
}

export interface RoleAuditResult {
  summary: string;
  findings: RoleAuditFinding[];
}

export function extractJsonObject(text: string): string | undefined {
  const start = text.indexOf("{");
  if (start === -1) { return undefined; }
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) { continue; }
    if (ch === "{") { depth++; }
    else if (ch === "}") {
      depth--;
      if (depth === 0) { return text.slice(start, i + 1); }
    }
  }
  return undefined;
}

export function parseRoleAuditResult(
  rawText: string,
  subjects: AuditSubject[],
  roles: { code: string; label: string }[]
): RoleAuditResult {
  const jsonSlice = extractJsonObject(rawText);
  if (!jsonSlice) {
    throw new Error("The agent's response didn't contain a recognizable result.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonSlice);
  } catch {
    throw new Error("The agent's response wasn't valid JSON.");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("The agent's response wasn't in the expected shape.");
  }
  const obj = parsed as Record<string, unknown>;
  const summary = typeof obj.summary === "string" ? obj.summary : "";
  const rawFindings = Array.isArray(obj.findings) ? obj.findings : [];

  const validRoleCodes = new Set(roles.map((r) => r.code));
  const roleByLabel = new Map(roles.map((r) => [r.label.toLowerCase(), r.code]));

  function normalizeRole(raw: unknown): string | undefined {
    if (typeof raw !== "string") { return undefined; }
    const trimmed = raw.trim();
    if (validRoleCodes.has(trimmed)) { return trimmed; }
    const byLabel = roleByLabel.get(trimmed.toLowerCase());
    if (byLabel) { return byLabel; }
    const leadingToken = trimmed.split(/[\s(]/, 1)[0];
    if (validRoleCodes.has(leadingToken)) { return leadingToken; }
    return undefined;
  }

  const byId = new Map(subjects.map((s) => [s.id.toLowerCase(), s]));

  const rawMapped = rawFindings
    .filter((f): f is Record<string, unknown> => Boolean(f) && typeof f === "object")
    .map((f) => ({
      employeeId: typeof f.employeeId === "string" ? f.employeeId : "",
      employeeName: typeof f.employeeName === "string" ? f.employeeName : "",
      title: typeof f.title === "string" ? f.title : "",
      currentRole: normalizeRole(f.currentRole) ?? "NONE",
      concern: (CONCERN_VALUES.includes(f.concern as RoleAuditConcern)
        ? f.concern
        : "UNUSUAL_FOR_TITLE") as RoleAuditConcern,
      suggestedRole: normalizeRole(f.suggestedRole),
      rationale: typeof f.rationale === "string" ? f.rationale : "",
    }))
    .filter((f) => f.employeeId);

  const findings: RoleAuditFinding[] = rawMapped.flatMap((f) => {
    const subject = byId.get(f.employeeId.toLowerCase().trim());
    if (!subject) { return []; }
    return [{ ...f, employeeName: subject.name, title: subject.title, currentRole: subject.role }];
  });

  return { summary, findings };
}

export function buildRoleAuditPrompt(
  subjects: AuditSubject[],
  roles: { code: string; label: string }[],
  criteria: AuditCriteria
): string {
  const opt = (alias: string, val: string, max = 100) =>
    val ? [`${alias}: "${sanitizeProfileField(val, max)}"`] : [];

  const roleByCode = new Map(roles.map((r) => [r.code, r.label]));
  const roster = subjects
    .map((s) => {
      const roleLabel = roleByCode.get(s.role);
      const sanitizedLabel = roleLabel ? sanitizeProfileField(roleLabel, 60) : undefined;
      const sanitizedRole = sanitizeProfileField(s.role, 40);
      const roleDesc =
        s.role === "NONE"
          ? "NONE (no access)"
          : `${sanitizedRole} (${sanitizedLabel ?? sanitizedRole})`;
      const parts: string[] = [
        `id: "${sanitizeProfileField(s.id, 254)}"`,
        `name: "${sanitizeProfileField(s.name, 120)}"`,
        ...opt("title", s.title),
        ...opt("level", s.jobLevel, 40),
        ...opt("dept", s.department),
        ...opt("function", s.function),
        ...opt("job_family", s.jobFamily),
        ...opt("location", s.location),
        ...opt("employment", s.employmentType, 60),
        ...opt("hired", s.hireDate, 10),
        `role: ${roleDesc}`,
      ];
      return `- ${parts.join(" | ")}`;
    })
    .join("\n");

  const validRoles = roles
    .filter((r) => r.code !== "NONE")
    .map((r) => `${r.code} (${sanitizeProfileField(r.label, 60)})`)
    .join(", ");

  const hasTitleData = subjects.some((s) => s.title || s.jobLevel || s.department || s.function);
  const lines: string[] = [
    "You are reviewing role assignments for an application.",
    hasTitleData
      ? "Each person includes their name and — where available — job title, level, department, function, job family, location, employment type, hire date, and current role."
      : "Each person includes their name and current role. No HR profile data is available for this workspace.",
  ];

  if (criteria.comparePeers && criteria.compareTitles && hasTitleData) {
    lines.push("Use job title, level, department, function, tenure, and role distribution patterns to identify mismatches.");
  } else if (criteria.compareTitles && hasTitleData) {
    lines.push("Use job title, level, department, function, and tenure to identify mismatches.");
  } else if (criteria.comparePeers) {
    lines.push(hasTitleData
      ? "Use role distribution patterns along with job title context to identify mismatches."
      : "Use role distribution patterns and email domain analysis to identify mismatches.");
  } else if (criteria.compareTitles) {
    lines.push("Use email domain patterns and roster position to identify unusual assignments.");
  }

  const hasAnyConcerns = criteria.comparePeers || criteria.compareTitles;
  if (hasAnyConcerns) {
    lines.push(
      "",
      "Flag anyone whose role looks wrong:",
      ...(criteria.comparePeers ? [
        "- OVER_PRIVILEGED: has broader access than seems warranted",
        "- UNDER_PRIVILEGED: has narrower access than expected given role distribution",
      ] : []),
      ...(criteria.compareTitles ? [
        "- UNUSUAL_FOR_TITLE: unusual assignment given the person's job title, level, or department",
      ] : []),
      "",
    );
  } else {
    lines.push("");
  }

  if (criteria.flagNoAccess) {
    lines.push(
      hasTitleData
        ? "Also flag users with NONE role who clearly should have access based on their job title, department, or seniority."
        : "Also flag users with NONE role who clearly should have access based on their email pattern or position in the roster.",
      ""
    );
  }

  if (criteria.customInstructions.trim()) {
    const sanitizedInstructions = criteria.customInstructions
      .replace(/\r/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/<<<|>>>/g, "")
      .trim()
      .slice(0, 500);
    lines.push(
      "Additional instructions (apply only to flagging criteria):",
      "<<<BEGIN USER INSTRUCTIONS>>>",
      sanitizedInstructions,
      "<<<END USER INSTRUCTIONS>>>",
      ""
    );
  }

  const validConcernTypes = [
    ...(criteria.comparePeers ? ["OVER_PRIVILEGED", "UNDER_PRIVILEGED"] : []),
    ...(criteria.compareTitles ? ["UNUSUAL_FOR_TITLE"] : []),
  ];
  const concernEnum = validConcernTypes.length > 0
    ? validConcernTypes.join("|")
    : "OVER_PRIVILEGED|UNDER_PRIVILEGED|UNUSUAL_FOR_TITLE";

  lines.push(
    `Valid role codes: ${validRoles}, or NONE for no access.`,
    "",
    "Roster:",
    roster,
    "",
    `Respond with ONLY a JSON object: {"summary": "<overview>", "findings": [{"employeeId": "<email from roster>", "employeeName": "<name from roster>", "title": "<title from roster>", "currentRole": "<code>", "concern": "${concernEnum}", "suggestedRole": "<code or omit>", "rationale": "<one sentence>"}]}`,
    "If nothing looks wrong, return empty findings array."
  );

  return lines.join("\n");
}
