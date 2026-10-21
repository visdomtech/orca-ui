import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DEFAULT_AUDIT_CRITERIA,
  sanitizeProfileField,
  toStr,
  type AuditCriteria,
  type AuditSubject,
  type RoleAuditConcern,
  type RoleAuditFinding,
  type RoleAuditResult,
} from "./roleAuditPrompt";

// ── Public types ──────────────────────────────────────────────────────────────

export interface HttpClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
}

export interface UsersAccessProps {
  appId: string;
  /** App-declared roles from rbac.ts — must include a NONE entry. */
  roles: { code: string; label: string }[];
  /**
   * Optional capabilities for the Access Matrix tab.
   * defaultRoles defines the factory defaults — admins can override per workspace via the UI.
   */
  capabilities?: { code: string; label: string; defaultRoles?: string[] }[];
  /**
   * Called after any capability-role assignment is saved or reset. Use this to
   * invalidate your app's own QueryClient cache for capability-roles.
   */
  onCapabilityRolesChanged?: () => void;
  /** Authenticated HTTP client (orcaGet/orcaPost/etc. adapter). */
  httpClient: HttpClient;
  /** The current user's email — used to prevent self-role-change in bulk actions. */
  currentUserEmail: string;
  /**
   * Provide to enable the Audit Roles tab. Receives the roster and criteria,
   * calls the backend AI agent, and resolves with the audit result.
   * Omit to hide the Audit tab.
   */
  auditRoles?: (
    subjects: AuditSubject[],
    roles: { code: string; label: string }[],
    criteria: AuditCriteria,
    signal?: AbortSignal
  ) => Promise<RoleAuditResult>;
}

// ── Re-exports for callers building auditRoles ────────────────────────────────

export type { AuditSubject, AuditCriteria, RoleAuditConcern, RoleAuditResult, RoleAuditFinding } from "./roleAuditPrompt";
export { buildRoleAuditPrompt, parseRoleAuditResult } from "./roleAuditPrompt";

// ── Internal context ──────────────────────────────────────────────────────────

interface Ctx {
  appId: string;
  httpClient: HttpClient;
  currentUserEmail: string;
  auditRoles?: UsersAccessProps["auditRoles"];
}

const UsersAccessCtx = createContext<Ctx | null>(null);

function useCtx(): Ctx {
  const ctx = useContext(UsersAccessCtx);
  if (!ctx) throw new Error("Must be used inside UsersAccess");
  return ctx;
}

// ── Query key helpers (match host's shape for `onCapabilityRolesChanged` compat) ─

const keys = {
  userRoles: (id: string) => ["approles", id, "user-roles"] as const,
  customRoles: (id: string) => ["approles", id, "custom-roles"] as const,
  capabilityRoles: (id: string) => ["approles", id, "capability-roles"] as const,
  hrRoles: () => ["hrglobalroles", "roles"] as const,
  employees: () => ["headcount", "employees", "all"] as const,
  auditHistory: (type: string, id: string) => ["audit", type, id] as const,
};

// ── API shapes ────────────────────────────────────────────────────────────────

interface UserAppRole { userEmail: string; roleCode: string; updatedAt: string }
interface AppCustomRole { code: string; label: string }
interface CapabilityRole { capabilityCode: string; roleCode: string }
interface HrRole { code: string; label: string }
interface Employee {
  workEmail: string;
  firstName?: string;
  lastName?: string;
  departmentCode?: string;
  hireDate?: string;
  customAttributes?: Record<string, unknown>;
}
interface EmployeeListResult { items: Employee[]; totalCount: number }
interface AuditLogEntry {
  auditId: number;
  entityType: string;
  entityId: string;
  action: string;
  userEmail: string;
  data?: Record<string, unknown>;
  createdAt: string;
}
interface AuditListResult { entries: AuditLogEntry[]; nextCursor: number }

// ── Internal hooks ────────────────────────────────────────────────────────────

function useUserRoles() {
  const { appId, httpClient } = useCtx();
  return useQuery<UserAppRole[]>({
    queryKey: keys.userRoles(appId),
    queryFn: () => httpClient.get(`/orcaagents/approles/apps/${appId}/user-roles`),
    enabled: !!appId,
  });
}

function useSetUserRole() {
  const { appId, httpClient } = useCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, roleCode }: { email: string; roleCode: string }) =>
      httpClient.put(`/orcaagents/approles/apps/${appId}/user-roles/${encodeURIComponent(email)}`, { roleCode }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.userRoles(appId) }),
  });
}

function useRemoveUserRole() {
  const { appId, httpClient } = useCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) =>
      httpClient.delete(`/orcaagents/approles/apps/${appId}/user-roles/${encodeURIComponent(email)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.userRoles(appId) }),
  });
}

function useCustomRoles() {
  const { appId, httpClient } = useCtx();
  return useQuery<AppCustomRole[]>({
    queryKey: keys.customRoles(appId),
    queryFn: () => httpClient.get(`/orcaagents/approles/apps/${appId}/custom-roles`),
    enabled: !!appId,
  });
}

function useCreateCustomRole() {
  const { appId, httpClient } = useCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { code: string; label: string }) =>
      httpClient.post(`/orcaagents/approles/apps/${appId}/custom-roles`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.customRoles(appId) }),
  });
}

function useDeleteCustomRole() {
  const { appId, httpClient } = useCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      httpClient.delete(`/orcaagents/approles/apps/${appId}/custom-roles/${code}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.customRoles(appId) }),
  });
}

function useCapabilityRoles() {
  const { appId, httpClient } = useCtx();
  return useQuery<CapabilityRole[]>({
    queryKey: keys.capabilityRoles(appId),
    queryFn: () => httpClient.get(`/orcaagents/approles/apps/${appId}/capability-roles`),
    enabled: !!appId,
    staleTime: 60_000,
  });
}

function useGrantCapabilityRole(onChanged?: () => void) {
  const { appId, httpClient } = useCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ capabilityCode, roleCode }: { capabilityCode: string; roleCode: string }) =>
      httpClient.put(`/orcaagents/approles/apps/${appId}/capability-roles/${capabilityCode}/${roleCode}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.capabilityRoles(appId) });
      onChanged?.();
    },
  });
}

function useRevokeCapabilityRole(onChanged?: () => void) {
  const { appId, httpClient } = useCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ capabilityCode, roleCode }: { capabilityCode: string; roleCode: string }) =>
      httpClient.delete(`/orcaagents/approles/apps/${appId}/capability-roles/${capabilityCode}/${roleCode}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.capabilityRoles(appId) });
      onChanged?.();
    },
  });
}

function useResetCapabilityRoles(onChanged?: () => void) {
  const { appId, httpClient } = useCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => httpClient.delete(`/orcaagents/approles/apps/${appId}/capability-roles`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.capabilityRoles(appId) });
      onChanged?.();
    },
  });
}

function useHrRoles() {
  const { httpClient } = useCtx();
  return useQuery<HrRole[]>({
    queryKey: keys.hrRoles(),
    queryFn: () => httpClient.get("/orcaagents/hrglobalroles/roles"),
    staleTime: 5 * 60_000,
  });
}

async function fetchAllEmployees(httpClient: HttpClient): Promise<Employee[]> {
  const first = await httpClient.get<EmployeeListResult>(
    "/orcaagents/headcount/employees?page=1&pageSize=100"
  );
  if (!first?.items) return [];
  const all = [...first.items];
  const totalPages = Math.min(Math.ceil(first.totalCount / 100), 50);
  if (totalPages <= 1) return all;
  for (let p = 2; p <= totalPages; p++) {
    const page = await httpClient.get<EmployeeListResult>(
      `/orcaagents/headcount/employees?page=${p}&pageSize=100`
    );
    if (page?.items) all.push(...page.items);
  }
  return all;
}

function useAllEmployees() {
  const { httpClient } = useCtx();
  return useQuery<Employee[]>({
    queryKey: keys.employees(),
    queryFn: () => fetchAllEmployees(httpClient),
    staleTime: 5 * 60_000,
  });
}

// ── Inline UI primitives ──────────────────────────────────────────────────────

type Tone = "green" | "amber" | "red" | "gray" | "navy" | "teal";

const TONE_CHIP: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  gray: "bg-slate-100 text-slate-600 ring-slate-200",
  navy: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  teal: "bg-cyan-50 text-cyan-800 ring-cyan-200",
};

function Chip({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE_CHIP[tone]}`}>
      {children}
    </span>
  );
}

function emailInitials(email: string): string {
  const [local] = email.split("@");
  const parts = local.split(/[._-]/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : local.slice(0, 2).toUpperCase();
}

function Avatar({ name, label, size = 32 }: { name: string; label?: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-700 font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {label ?? emailInitials(name)}
    </span>
  );
}

function useModalA11y(onClose: () => void) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  return closeButtonRef;
}

function Modal({ title, onClose, children, footer }: {
  title: string; onClose: () => void; children: ReactNode; footer?: ReactNode;
}) {
  const closeButtonRef = useModalA11y(onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div role="dialog" aria-modal="true" aria-label={title}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close"
            className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</div>
        )}
      </div>
    </div>
  );
}

function DataTable({ headers, children }: { headers: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left">
            {headers.map((header, i) => (
              <th key={i} className="px-1.5 py-2 align-bottom text-[11px] font-semibold leading-tight text-slate-500">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center">
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300">
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300">
      {children}
    </button>
  );
}

function PaneHeader({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-semibold text-slate-800">{children}</h2>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function nameList(names: string[], max = 3): string {
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} and ${names.length - max} more`;
}

function RailItem({ label, icon, count, on, onClick }: {
  label: string; icon?: ReactNode; count?: number; on: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
        on ? "bg-white font-medium text-indigo-600 shadow-sm ring-1 ring-slate-200"
           : "text-slate-600 hover:bg-white hover:text-slate-800"
      }`}>
      <span className="flex min-w-0 items-center gap-1.5 truncate">
        {label}
        {icon && <span className={on ? "text-indigo-600" : "text-indigo-500"}>{icon}</span>}
      </span>
      {count !== undefined && (
        <span className={`shrink-0 rounded-full px-1.5 text-[11px] tabular-nums ${
          on ? "bg-indigo-50 text-indigo-600" : "bg-slate-200 text-slate-500"
        }`}>{count}</span>
      )}
    </button>
  );
}

function PagerButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
      {children}
    </button>
  );
}

function SparkleIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M10 2.5c.4 0 .7.3.8.7l.9 3.6a5 5 0 0 0 3.6 3.6l3.6.9a.8.8 0 0 1 0 1.6l-3.6.9a5 5 0 0 0-3.6 3.6l-.9 3.6a.8.8 0 0 1-1.6 0l-.9-3.6a5 5 0 0 0-3.6-3.6l-3.6-.9a.8.8 0 0 1 0-1.6l3.6-.9a5 5 0 0 0 3.6-3.6l.9-3.6c.1-.4.4-.7.8-.7Z" />
      <path d="M19 1.5c.2 0 .4.1.4.3l.4 1.4a2 2 0 0 0 1.4 1.4l1.4.4a.4.4 0 0 1 0 .8l-1.4.4a2 2 0 0 0-1.4 1.4l-.4 1.4a.4.4 0 0 1-.8 0l-.4-1.4a2 2 0 0 0-1.4-1.4l-1.4-.4a.4.4 0 0 1 0-.8l1.4-.4a2 2 0 0 0 1.4-1.4l.4-1.4c0-.2.2-.3.4-.3Z" />
    </svg>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 disabled:bg-slate-50 disabled:text-slate-400";

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function describeAuditEntry(entry: AuditLogEntry): string {
  const d = entry.data ?? {};
  if (entry.entityType === "app_user_role") {
    if (entry.action === "update" || entry.action === "create") {
      const email = typeof d.email === "string" ? d.email : entry.entityId;
      const roleCode = typeof d.roleCode === "string" ? d.roleCode : "";
      return roleCode ? `Set ${email} to ${roleCode}` : `Updated role for ${email}`;
    }
    if (entry.action === "delete") {
      const email = typeof d.email === "string" ? d.email : entry.entityId;
      return `Removed ${email}`;
    }
  }
  if (entry.entityType === "app_custom_role") {
    if (entry.action === "create") {
      const label = typeof d.label === "string" ? d.label : "";
      const code = typeof d.code === "string" ? d.code : "";
      return label ? `Created custom role: ${label} (${code})` : `Created custom role: ${code}`;
    }
    if (entry.action === "delete") {
      const code = typeof d.code === "string" ? d.code : entry.entityId;
      return `Deleted custom role: ${code}`;
    }
  }
  return entry.action;
}

const PAGE_SIZE = 20;

// ── Root component ────────────────────────────────────────────────────────────

type Pane = "users" | "matrix" | "history" | "audit";

export function UsersAccess({
  appId,
  roles,
  capabilities,
  onCapabilityRolesChanged,
  httpClient,
  currentUserEmail,
  auditRoles,
}: UsersAccessProps) {
  return (
    <UsersAccessCtx.Provider value={{ appId, httpClient, currentUserEmail, auditRoles }}>
      <UsersAccessInner
        roles={roles}
        capabilities={capabilities}
        onCapabilityRolesChanged={onCapabilityRolesChanged}
      />
    </UsersAccessCtx.Provider>
  );
}

function UsersAccessInner({
  roles,
  capabilities,
  onCapabilityRolesChanged,
}: {
  roles: UsersAccessProps["roles"];
  capabilities: UsersAccessProps["capabilities"];
  onCapabilityRolesChanged?: () => void;
}) {
  const { appId, httpClient, auditRoles } = useCtx();
  const [pane, setPane] = useState<Pane>("users");
  const { data: assignments = [] } = useUserRoles();
  const { data: allWorkspaceEmployees = [], isLoading: isLoadingEmployees } = useAllEmployees();

  const mergedAssignments = useMemo(() => {
    const seen = new Map(assignments.map((a) => [a.userEmail.toLowerCase(), a]));
    const result = [...assignments];
    for (const emp of allWorkspaceEmployees) {
      if (!seen.has(emp.workEmail.toLowerCase())) {
        result.push({ userEmail: emp.workEmail, roleCode: "NONE", updatedAt: "" });
      }
    }
    return result;
  }, [assignments, allWorkspaceEmployees]);

  const [auditResult, setAuditResult] = useState<RoleAuditResult | undefined>();
  const auditAbortRef = useRef<AbortController | null>(null);
  const auditTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => {
    clearTimeout(auditTimeoutRef.current);
    auditAbortRef.current?.abort();
  }, []);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const managingRoleCodes = useMemo(() => {
    if (!capabilities) return new Set<string>();
    const cap = capabilities.find((c) => c.code === "MANAGE_USERS");
    return new Set(cap?.defaultRoles ?? []);
  }, [capabilities]);

  const { withAccess, rolesInUse, managers } = useMemo(() => {
    const wa = mergedAssignments.filter((a) => a.roleCode !== "NONE");
    return {
      withAccess: wa,
      rolesInUse: new Set(wa.map((a) => a.roleCode)).size,
      managers: wa.filter((a) => managingRoleCodes.has(a.roleCode)),
    };
  }, [mergedAssignments, managingRoleCodes]);

  const summary = `${withAccess.length} of ${mergedAssignments.length} ${
    mergedAssignments.length === 1 ? "person has" : "people have"
  } access, in ${rolesInUse} ${rolesInUse === 1 ? "role" : "roles"}. ${
    managers.length
  } can change access${managers.length > 0 ? `: ${nameList(managers.map((m) => m.userEmail))}.` : "."}`;

  const [auditError, setAuditError] = useState<string | undefined>();
  const [auditPending, setAuditPending] = useState(false);
  const subjects = useMemo<AuditSubject[]>(() => {
    type EmpProfile = {
      name: string; title: string; jobFamily: string; jobLevel: string;
      department: string; function: string; location: string;
      employmentType: string; hireDate: string;
    };
    const empMap = new Map<string, EmpProfile>(
      allWorkspaceEmployees.map((e): [string, EmpProfile] => {
        const a = e.customAttributes ?? {};
        return [e.workEmail.toLowerCase(), {
          name: sanitizeProfileField(`${e.firstName ?? ""} ${e.lastName ?? ""}`.trim() || e.workEmail),
          title: sanitizeProfileField(toStr(a.job_title)),
          jobFamily: sanitizeProfileField(toStr(a.job_family)),
          jobLevel: sanitizeProfileField(toStr(a.job_level)),
          department: sanitizeProfileField(e.departmentCode ?? ""),
          function: sanitizeProfileField(toStr(a.function)),
          location: sanitizeProfileField(toStr(a.job_location)),
          employmentType: sanitizeProfileField(toStr(a.employment_type)),
          hireDate: e.hireDate ? sanitizeProfileField(e.hireDate.slice(0, 10), 10) : "",
        }];
      })
    );
    return mergedAssignments.map((a) => {
      const emp = empMap.get(a.userEmail.toLowerCase());
      return {
        id: a.userEmail.toLowerCase(),
        name: emp?.name ?? a.userEmail,
        title: emp?.title ?? "",
        jobFamily: emp?.jobFamily ?? "",
        jobLevel: emp?.jobLevel ?? "",
        department: emp?.department ?? "",
        function: emp?.function ?? "",
        location: emp?.location ?? "",
        employmentType: emp?.employmentType ?? "",
        hireDate: emp?.hireDate ?? "",
        role: a.roleCode,
      };
    });
  }, [mergedAssignments, allWorkspaceEmployees]);

  const [auditSubjectCount, setAuditSubjectCount] = useState<number | undefined>();

  async function runAudit(criteria: AuditCriteria): Promise<RoleAuditResult> {
    if (!auditRoles) throw new Error("auditRoles not provided");
    auditAbortRef.current?.abort();
    const controller = new AbortController();
    auditAbortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 120_000);
    auditTimeoutRef.current = timeoutId;

    setAuditPending(true);
    setAuditError(undefined);
    setAuditSubjectCount(undefined);
    const auditedSubjects = subjects;
    try {
      const result = await auditRoles(auditedSubjects, roles, criteria, controller.signal);
      if (mountedRef.current && auditAbortRef.current === controller) {
        setAuditResult(result);
        setAuditSubjectCount(auditedSubjects.length);
      }
      return result;
    } catch (err) {
      if (mountedRef.current && auditAbortRef.current === controller) {
        let msg: string;
        if (err instanceof Error && err.name === "AbortError") {
          msg = "The audit timed out after 2 minutes. Try again with a smaller roster.";
        } else {
          msg = err instanceof Error ? err.message : "Audit failed";
        }
        setAuditError(msg);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
      auditTimeoutRef.current = undefined;
      if (mountedRef.current && auditAbortRef.current === controller) {
        setAuditPending(false);
      }
    }
  }

  const historyUserRoles = useQuery<AuditListResult>({
    queryKey: keys.auditHistory("app_user_role", appId),
    queryFn: () => httpClient.get(`/orcaagents/audit?entityType=app_user_role&entityId=${appId}&limit=100`),
    staleTime: 60_000,
  });
  const historyCustomRoles = useQuery<AuditListResult>({
    queryKey: keys.auditHistory("app_custom_role", appId),
    queryFn: () => httpClient.get(`/orcaagents/audit?entityType=app_custom_role&entityId=${appId}&limit=100`),
    staleTime: 60_000,
  });
  const historyCount =
    (historyUserRoles.data?.entries.length ?? 0) +
    (historyCustomRoles.data?.entries.length ?? 0);

  const showMatrix = capabilities !== undefined && capabilities.length > 0;
  const showAudit = auditRoles !== undefined;

  const shown: Pane =
    pane === "matrix" && !showMatrix ? "users"
    : pane === "audit" && !showAudit ? "users"
    : pane;

  return (
    <div className="space-y-5">
      <SectionTitle hint={summary}>Users & Access</SectionTitle>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="grid lg:grid-cols-[200px_minmax(0,1fr)]">
          <nav className="space-y-0.5 border-b border-slate-200 bg-slate-50 p-2 lg:border-b-0 lg:border-r">
            <RailItem label="Users" count={mergedAssignments.length}
              on={shown === "users"} onClick={() => setPane("users")} />
            {showMatrix && (
              <RailItem label="Access Matrix" on={shown === "matrix"} onClick={() => setPane("matrix")} />
            )}
            <RailItem label="Change History"
              count={historyCount > 0 ? historyCount : undefined}
              on={shown === "history"} onClick={() => setPane("history")} />
            {showAudit && (
              <RailItem
                label="Audit Roles"
                icon={<SparkleIcon className="h-3.5 w-3.5" />}
                count={auditResult ? auditResult.findings.length : undefined}
                on={shown === "audit"}
                onClick={() => setPane("audit")}
              />
            )}
          </nav>

          <div className="min-w-0 p-4">
            {shown === "users" && (
              <UsersPane roles={roles} assignments={mergedAssignments} />
            )}
            {shown === "matrix" && showMatrix && (
              <MatrixPane
                capabilities={capabilities}
                roles={roles}
                assignments={mergedAssignments}
                onCapabilityRolesChanged={onCapabilityRolesChanged}
              />
            )}
            {shown === "history" && <HistoryPane />}
            {shown === "audit" && showAudit && (
              <AuditPane
                subjects={subjects}
                roles={roles}
                result={auditResult}
                onResult={setAuditResult}
                onClearAuditCount={() => setAuditSubjectCount(undefined)}
                onRun={runAudit}
                isPending={auditPending}
                error={auditError}
                isLoadingEmployees={isLoadingEmployees}
                auditSubjectCount={auditSubjectCount}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Users pane ────────────────────────────────────────────────────────────────

function UsersPane({
  roles,
  assignments,
}: {
  roles: { code: string; label: string }[];
  assignments: UserAppRole[];
}) {
  const { currentUserEmail } = useCtx();
  const setRole = useSetUserRole();
  const removeRole = useRemoveUserRole();
  const { data: hrRoles = [] } = useHrRoles();
  const { data: customRoles = [] } = useCustomRoles();
  const { data: allEmployees = [], isLoading: empLoading } = useAllEmployees();

  const [query, setQuery] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [filterFamily, setFilterFamily] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [lastFilterKey, setLastFilterKey] = useState(
    () => [query, filterRole, filterGroup, filterFamily, filterLocation].join("\0")
  );
  const [bulkRole, setBulkRole] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | undefined>();
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const hrRoleCodes = useMemo(() => new Set(hrRoles.map((r) => r.code)), [hrRoles]);
  const customRoleCodes = useMemo(() => new Set(customRoles.map((r) => r.code)), [customRoles]);

  const appOnlyRoles = roles.filter(
    (r) => r.code !== "NONE" && !hrRoleCodes.has(r.code) && !customRoleCodes.has(r.code)
  );
  const noneRole = roles.find((r) => r.code === "NONE");

  const roleOrder = useMemo(
    () => new Map([...hrRoles, ...roles.filter((r) => r.code !== "NONE"), ...customRoles].map((r, i) => [r.code, i])),
    [hrRoles, roles, customRoles]
  );

  const ordered = useMemo(
    () => [...assignments].sort((a, b) => {
      const ai = roleOrder.get(a.roleCode) ?? 999;
      const bi = roleOrder.get(b.roleCode) ?? 999;
      return ai - bi || a.userEmail.localeCompare(b.userEmail);
    }),
    [assignments, roleOrder]
  );

  const employeeMap = useMemo(() => {
    const m = new Map<string, { name: string; title: string; group: string; jobFamily: string; location: string }>();
    for (const e of allEmployees) {
      const a = e.customAttributes ?? {};
      const str = (v: unknown) => (typeof v === "string" ? v : "");
      m.set(e.workEmail.toLowerCase(), {
        name: `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim() || e.workEmail,
        title: str(a.job_title),
        group: e.departmentCode ?? "",
        jobFamily: str(a.job_family),
        location: str(a.job_location),
      });
    }
    return m;
  }, [allEmployees]);

  const allEmployeeEmails = useMemo(
    () => new Set(allEmployees.map((e) => e.workEmail.toLowerCase())),
    [allEmployees]
  );

  const options = useMemo(() => {
    const distinct = (values: string[]) =>
      [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const emps = assignments.map((a) => employeeMap.get(a.userEmail.toLowerCase()));
    return {
      groups: distinct(emps.map((e) => e?.group ?? "")),
      families: distinct(emps.map((e) => e?.jobFamily ?? "")),
      locations: distinct(emps.map((e) => e?.location ?? "")),
    };
  }, [assignments, employeeMap]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ordered.filter((a) => {
      const emp = employeeMap.get(a.userEmail.toLowerCase());
      const name = emp?.name.toLowerCase() ?? "";
      const title = emp?.title.toLowerCase() ?? "";
      return (
        (!q || a.userEmail.toLowerCase().includes(q) || name.includes(q) || title.includes(q)) &&
        (!filterRole || a.roleCode === filterRole) &&
        (!filterGroup || emp?.group === filterGroup) &&
        (!filterFamily || emp?.jobFamily === filterFamily) &&
        (!filterLocation || emp?.location === filterLocation)
      );
    });
  }, [ordered, query, filterRole, filterGroup, filterFamily, filterLocation, employeeMap]);

  const filterKey = [query, filterRole, filterGroup, filterFamily, filterLocation].join("\0");
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const selectable = useMemo(
    () => filtered.filter((a) => a.userEmail.toLowerCase() !== currentUserEmail.toLowerCase()),
    [filtered, currentUserEmail]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paged = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const validSelected = useMemo(() => {
    const visible = new Set(selectable.map((a) => a.userEmail));
    const next = new Set([...selected].filter((id) => visible.has(id)));
    return next.size === selected.size ? selected : next;
  }, [selectable, selected]);

  const allSelected = selectable.length > 0 && validSelected.size === selectable.length;
  const someSelected = validSelected.size > 0 && !allSelected;

  const toggle = (email: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(selectable.map((a) => a.userEmail)));

  const selectedAssignments = selectable.filter((a) => validSelected.has(a.userEmail));
  const toChange = bulkRole ? selectedAssignments.filter((a) => a.roleCode !== bulkRole) : [];
  const pending = setRole.isPending;
  const closeConfirm = useCallback(() => { if (!pending) setConfirming(false); }, [pending]);

  function applyBulk() {
    if (!bulkRole) return;
    const snapshot = [...toChange];
    if (snapshot.length === 0) { setConfirming(false); return; }
    const count = snapshot.length;
    const role = bulkRole;
    const roleLabel = [...hrRoles, ...roles].find((r) => r.code === role)?.label ?? role;
    const results: ("ok" | "error")[] = [];
    const failures: { email: string; err: unknown }[] = [];
    for (const a of snapshot) {
      setRole.mutate({ email: a.userEmail, roleCode: role }, {
        onSuccess: () => { results.push("ok"); },
        onError: (err) => { failures.push({ email: a.userEmail, err }); results.push("error"); },
        onSettled: () => {
          if (results.length === snapshot.length && mountedRef.current) {
            setConfirming(false);
            if (failures.length === 0) {
              setNotice(`${count} ${count === 1 ? "person" : "people"} set to ${roleLabel}.`);
              setSelected(new Set());
              setBulkRole("");
            } else {
              setNotice("Some assignments failed. Please try again.");
            }
          }
        },
      });
    }
  }

  const filtersOn = query.trim() !== "" || filterRole !== "" || filterGroup !== "" || filterFamily !== "" || filterLocation !== "";

  return (
    <div>
      <PaneHeader
        title="Users"
        hint="Everyone in your workspace. Assign a role to grant access, or set to No Access to remove it."
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or title…" aria-label="Search users"
          className={inputClass.replace("w-full", "w-56")} />
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
          aria-label="Filter by role"
          className={`${inputClass.replace("w-full", "w-auto max-w-[200px]")} bg-white ${filterRole ? "border-indigo-400 text-indigo-600" : ""}`}>
          <option value="">All roles</option>
          {hrRoles.length > 0 && (
            <optgroup label="HR Global Roles">
              {hrRoles.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
            </optgroup>
          )}
          {appOnlyRoles.length > 0 && (
            <optgroup label="App Roles">
              {appOnlyRoles.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
            </optgroup>
          )}
          {customRoles.length > 0 && (
            <optgroup label="Custom Roles">
              {customRoles.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
            </optgroup>
          )}
        </select>
        {options.groups.length > 0 && (
          <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}
            aria-label="Filter by group"
            className={`${inputClass.replace("w-full", "w-auto max-w-[200px]")} bg-white ${filterGroup ? "border-indigo-400 text-indigo-600" : ""}`}>
            <option value="">All groups</option>
            {options.groups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        )}
        {options.families.length > 0 && (
          <select value={filterFamily} onChange={(e) => setFilterFamily(e.target.value)}
            aria-label="Filter by job family"
            className={`${inputClass.replace("w-full", "w-auto max-w-[200px]")} bg-white ${filterFamily ? "border-indigo-400 text-indigo-600" : ""}`}>
            <option value="">All job families</option>
            {options.families.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        )}
        {options.locations.length > 0 && (
          <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}
            aria-label="Filter by location"
            className={`${inputClass.replace("w-full", "w-auto max-w-[200px]")} bg-white ${filterLocation ? "border-indigo-400 text-indigo-600" : ""}`}>
            <option value="">All locations</option>
            {options.locations.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        )}
        {filtersOn && (
          <button type="button"
            onClick={() => { setQuery(""); setFilterRole(""); setFilterGroup(""); setFilterFamily(""); setFilterLocation(""); }}
            className="text-xs font-medium text-indigo-600 hover:underline">
            Clear filters
          </button>
        )}
        <span className="ml-auto text-xs text-slate-500">
          {filtersOn ? `${filtered.length} of ${assignments.length} people match` : `${assignments.length} people`}
        </span>
      </div>

      {validSelected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm">
          <span className="font-medium text-slate-800">
            {allSelected && selectable.length > PAGE_SIZE
              ? `All ${validSelected.size} ${filtersOn ? "matching " : ""}people selected`
              : `${validSelected.size} selected`}
          </span>
          <span className="text-slate-300">|</span>
          <label className="flex items-center gap-2 text-slate-600">
            Assign role
            <select value={bulkRole} onChange={(e) => setBulkRole(e.target.value)}
              aria-label="Role to assign to selected users"
              className={`${inputClass.replace("w-full", "w-56")} bg-white`}>
              <option value="">Choose a role…</option>
              {hrRoles.length > 0 && (
                <optgroup label="HR Global Roles">
                  {hrRoles.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
                </optgroup>
              )}
              {appOnlyRoles.length > 0 && (
                <optgroup label="App Roles">
                  {appOnlyRoles.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
                </optgroup>
              )}
              {customRoles.length > 0 && (
                <optgroup label="Custom Roles">
                  {customRoles.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
                </optgroup>
              )}
            </select>
          </label>
          <PrimaryButton
            onClick={() => setConfirming(true)}
            disabled={!bulkRole || toChange.length === 0 || setRole.isPending}>
            {bulkRole && toChange.length === 0 ? "Already assigned" : `Apply to ${bulkRole ? toChange.length : validSelected.size}`}
          </PrimaryButton>
          <button type="button" onClick={() => setSelected(new Set())}
            className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-700 hover:underline">
            Clear selection
          </button>
        </div>
      )}

      {notice && validSelected.size === 0 && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(undefined)} aria-label="Dismiss"
            className="text-emerald-600 hover:text-emerald-800">✕</button>
        </div>
      )}

      {assignments.length === 0 ? (
        <Empty title="No employees found" />
      ) : (
        <DataTable headers={[
          <input key="all" type="checkbox" checked={allSelected}
            ref={(el) => { if (el) el.indeterminate = someSelected; }}
            onChange={toggleAll} disabled={selectable.length === 0}
            title={allSelected ? "Clear selection" : `Select all ${selectable.length} people`}
            aria-label="Select all users shown"
            className="h-4 w-4 cursor-pointer accent-indigo-600" />,
          "User", "Role", "",
        ]}>
          {paged.map(({ userEmail, roleCode }) => {
            const isMe = userEmail.toLowerCase() === currentUserEmail.toLowerCase();
            const isSelected = validSelected.has(userEmail);
            const emp = employeeMap.get(userEmail.toLowerCase());
            const initials = emp ? (() => {
              const words = emp.name.trim().split(/\s+/);
              return words.length >= 2
                ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
                : emp.name.slice(0, 2).toUpperCase();
            })() : undefined;
            return (
              <tr key={userEmail} className={isSelected ? "bg-indigo-50" : isMe ? "bg-indigo-50/40" : "hover:bg-slate-50"}>
                <td className="w-8 px-1.5 py-2">
                  <input type="checkbox" checked={isSelected} disabled={isMe}
                    onChange={() => toggle(userEmail)}
                    title={isMe ? "You can't change your own role in bulk" : undefined}
                    aria-label={`Select ${userEmail}`}
                    className="h-4 w-4 cursor-pointer accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-30" />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={userEmail} label={initials} size={28} />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-1.5 truncate text-sm font-medium text-slate-800">
                        {emp?.name ?? userEmail}
                        {isMe && (
                          <span className="inline-flex items-center rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">You</span>
                        )}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {emp ? (emp.title || userEmail) : undefined}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <select value={roleCode ?? "NONE"} onChange={(e) => setRole.mutate({ email: userEmail, roleCode: e.target.value })}
                    disabled={isMe} aria-label={`Role for ${userEmail}`}
                    className={`${inputClass.replace("w-full", "w-60")} bg-white`}>
                    {hrRoles.length > 0 && (
                      <optgroup label="HR Global Roles">
                        {hrRoles.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
                      </optgroup>
                    )}
                    {appOnlyRoles.length > 0 && (
                      <optgroup label="App Roles">
                        {appOnlyRoles.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
                      </optgroup>
                    )}
                    {customRoles.length > 0 && (
                      <optgroup label="Custom Roles">
                        {customRoles.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
                      </optgroup>
                    )}
                    <optgroup label="───">
                      {noneRole && <option value="NONE">{noneRole.label}</option>}
                    </optgroup>
                  </select>
                </td>
                <td className="px-3 py-2 text-right">
                  {!empLoading && !allEmployeeEmails.has(userEmail.toLowerCase()) && (
                    <button type="button" title="Remove user"
                      onClick={() => removeRole.mutate(userEmail)} aria-label={`Remove ${userEmail}`}
                      className="inline-flex items-center justify-center rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600">
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor"
                        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="2 4 14 4" />
                        <path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
                        <path d="M3 4l.9 9a1 1 0 0 0 1 .9h6.2a1 1 0 0 0 1-.9L13 4" />
                        <line x1="6.5" y1="7" x2="6.5" y2="11" />
                        <line x1="9.5" y1="7" x2="9.5" y2="11" />
                      </svg>
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </DataTable>
      )}

      {assignments.length > 0 && filtered.length === 0 && (
        <p className="py-4 text-center text-xs text-slate-400">No one matches these filters.</p>
      )}

      {filtered.length > 0 && totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {(pageSafe - 1) * PAGE_SIZE + 1}–{Math.min(pageSafe * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-2">
            <PagerButton onClick={() => setPage(pageSafe - 1)} disabled={pageSafe <= 1}>Prev</PagerButton>
            <span className="tabular-nums">Page {pageSafe} of {totalPages}</span>
            <PagerButton onClick={() => setPage(pageSafe + 1)} disabled={pageSafe >= totalPages}>Next</PagerButton>
          </div>
        </div>
      )}

      {confirming && bulkRole && (
        <Modal title="Assign role" onClose={closeConfirm} footer={
          <>
            <SecondaryButton onClick={() => setConfirming(false)} disabled={setRole.isPending}>Cancel</SecondaryButton>
            <PrimaryButton onClick={applyBulk} disabled={setRole.isPending || toChange.length === 0}>
              {setRole.isPending ? "Assigning…" : `Set ${toChange.length} ${toChange.length === 1 ? "person" : "people"}`}
            </PrimaryButton>
          </>
        }>
          <p className="text-sm text-slate-700">
            Set <span className="font-semibold">{toChange.length}</span>{" "}
            {toChange.length === 1 ? "person" : "people"} to{" "}
            <span className="font-semibold">{[...hrRoles, ...roles].find((r) => r.code === bulkRole)?.label ?? bulkRole}</span>?
            Their access changes immediately.
          </p>
          {selectedAssignments.length > toChange.length && (
            <p className="mt-2 text-xs text-slate-500">
              {selectedAssignments.length - toChange.length} of the selected already have this role and are left as they are.
            </p>
          )}
          {bulkRole === "NONE" && (
            <p className="mt-2 text-xs text-amber-700">No Access removes every capability — they will no longer be able to use this app.</p>
          )}
          <ul className="mt-3 max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200 text-sm">
            {toChange.map((a) => {
              const emp = employeeMap.get(a.userEmail.toLowerCase());
              return (
                <li key={a.userEmail} className="flex items-center justify-between gap-3 px-3 py-1.5">
                  <span className="min-w-0 truncate text-slate-800">{emp?.name ?? a.userEmail}</span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {[...hrRoles, ...roles].find((r) => r.code === a.roleCode)?.label ?? a.roleCode} →{" "}
                    {[...hrRoles, ...roles].find((r) => r.code === bulkRole)?.label ?? bulkRole}
                  </span>
                </li>
              );
            })}
          </ul>
        </Modal>
      )}
    </div>
  );
}

// ── Access matrix pane ────────────────────────────────────────────────────────

interface AppCapability { code: string; label: string; defaultRoles?: string[] }

function MatrixPane({
  capabilities,
  roles,
  assignments,
  onCapabilityRolesChanged,
}: {
  capabilities: AppCapability[];
  roles: { code: string; label: string }[];
  assignments: UserAppRole[];
  onCapabilityRolesChanged?: () => void;
}) {
  const { data: dbPairs = [], isLoading } = useCapabilityRoles();
  const grant = useGrantCapabilityRole(onCapabilityRolesChanged);
  const revoke = useRevokeCapabilityRole(onCapabilityRolesChanged);
  const reset = useResetCapabilityRoles(onCapabilityRolesChanged);
  const { data: customRoles = [] } = useCustomRoles();
  const { data: hrRoles = [] } = useHrRoles();
  const createCustomRole = useCreateCustomRole();
  const deleteCustomRole = useDeleteCustomRole();
  const [confirmReset, setConfirmReset] = useState(false);
  const [editing, setEditing] = useState(false);
  const [addingRole, setAddingRole] = useState(false);
  const [newRoleLabel, setNewRoleLabel] = useState("");

  const appRoleCodes = useMemo(() => new Set(roles.map((r) => r.code)), [roles]);
  const customRoleCodes = useMemo(() => new Set(customRoles.map((r) => r.code)), [customRoles]);
  const hrRolesForMatrix = useMemo(() => hrRoles.filter((r) => !appRoleCodes.has(r.code)), [hrRoles, appRoleCodes]);
  const staticGrantingRoles = roles.filter((r) => r.code !== "NONE");
  const grantingRoles = [...hrRolesForMatrix, ...staticGrantingRoles, ...customRoles];
  const isMutating = grant.isPending || revoke.isPending || reset.isPending || createCustomRole.isPending || deleteCustomRole.isPending;
  const isCustomized = dbPairs.length > 0;
  const newRoleCode = newRoleLabel.trim().toUpperCase().replace(/\s+/g, "_");

  function handleCreateRole() {
    if (!newRoleCode) return;
    createCustomRole.mutate({ code: newRoleCode, label: newRoleLabel.trim() }, {
      onSuccess: () => { setNewRoleLabel(""); setAddingRole(false); },
    });
  }

  function effectiveRoles(cap: AppCapability): Set<string> {
    const dbForCap = dbPairs.filter((p) => p.capabilityCode === cap.code);
    return new Set(dbForCap.length > 0 ? dbForCap.map((p) => p.roleCode) : (cap.defaultRoles ?? []));
  }

  function handleToggle(cap: AppCapability, roleCode: string) {
    const dbForCap = dbPairs.filter((p) => p.capabilityCode === cap.code);
    const isInDBMode = dbForCap.length > 0;
    const effective = effectiveRoles(cap);
    const isOn = effective.has(roleCode);
    if (isInDBMode) {
      if (isOn) revoke.mutate({ capabilityCode: cap.code, roleCode });
      else grant.mutate({ capabilityCode: cap.code, roleCode });
    } else {
      const next = new Set(effective);
      if (isOn) next.delete(roleCode);
      else next.add(roleCode);
      for (const r of next) grant.mutate({ capabilityCode: cap.code, roleCode: r });
    }
  }

  return (
    <div>
      <PaneHeader
        title="Access Matrix"
        hint={editing ? "Configure which roles have each capability. Changes are saved per workspace." : "Read-only view. Click Edit to make changes."}
        action={
          editing ? (
            <div className="flex items-center gap-2">
              {isCustomized && (
                <SecondaryButton onClick={() => setConfirmReset(true)} disabled={isMutating}>Reset to defaults</SecondaryButton>
              )}
              <SecondaryButton onClick={() => setAddingRole(true)} disabled={addingRole || isMutating}>+ Add role</SecondaryButton>
              <PrimaryButton onClick={() => setEditing(false)} disabled={isMutating}>Done</PrimaryButton>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <SecondaryButton onClick={() => setAddingRole(true)} disabled={addingRole}>+ Add role</SecondaryButton>
              <SecondaryButton onClick={() => setEditing(true)}>Edit</SecondaryButton>
            </div>
          )
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" aria-label="Loading" />
        </div>
      ) : (
        <DataTable headers={[
          "Capability",
          ...grantingRoles.map((role) => {
            const count = assignments.filter((a) => a.roleCode === role.code).length;
            const isCustom = customRoleCodes.has(role.code);
            return (
              <span key={role.code} className="mx-auto block w-[92px] text-center">
                <span className="flex items-center justify-center gap-1">
                  <span>{role.label}</span>
                  {isCustom && (
                    <button type="button" onClick={() => deleteCustomRole.mutate(role.code)}
                      disabled={deleteCustomRole.isPending} aria-label={`Delete role ${role.label}`}
                      title="Delete this role"
                      className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[10px] text-slate-400 hover:bg-red-100 hover:text-red-600 disabled:opacity-40">×</button>
                  )}
                </span>
                <span className="mt-0.5 block font-normal text-slate-400">
                  {count} {count === 1 ? "person" : "people"}
                </span>
              </span>
            );
          }),
          addingRole ? (
            <div key="__add" className="flex items-center gap-1">
              <input autoFocus type="text" value={newRoleLabel} onChange={(e) => setNewRoleLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateRole();
                  if (e.key === "Escape") { setAddingRole(false); setNewRoleLabel(""); }
                }}
                placeholder="Role name…" aria-label="New role name"
                className="w-24 rounded border border-slate-300 px-1.5 py-0.5 text-xs text-slate-800 focus:border-indigo-400 focus:outline-none" />
              <button type="button" onClick={handleCreateRole} disabled={!newRoleCode || createCustomRole.isPending}
                aria-label="Confirm new role" className="text-indigo-600 hover:text-indigo-700 disabled:opacity-40">✓</button>
              <button type="button" onClick={() => { setAddingRole(false); setNewRoleLabel(""); }}
                aria-label="Cancel" className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
          ) : (
            <button key="__add" type="button" onClick={() => setAddingRole(true)} aria-label="Add custom role"
              title="Add custom role"
              className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-slate-300 text-sm font-bold text-slate-400 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600">+</button>
          ),
        ]}>
          {capabilities.map((cap) => {
            const effective = effectiveRoles(cap);
            return (
              <tr key={cap.code} className="hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-700">{cap.label}</td>
                {grantingRoles.map((role) => {
                  const isOn = effective.has(role.code);
                  return (
                    <td key={role.code} className="px-1.5 py-2 text-center">
                      {editing ? (
                        <input type="checkbox" checked={isOn} onChange={() => handleToggle(cap, role.code)}
                          disabled={isMutating} aria-label={`${role.label} has ${cap.label}`}
                          className="h-4 w-4 cursor-pointer accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-50" />
                      ) : isOn ? (
                        <svg className="mx-auto h-4 w-4 text-emerald-500" viewBox="0 0 16 16" fill="currentColor"
                          aria-label={`${role.label} has ${cap.label}`}>
                          <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                        </svg>
                      ) : undefined}
                    </td>
                  );
                })}
                <td className="px-1.5 py-2" />
              </tr>
            );
          })}
        </DataTable>
      )}

      {confirmReset && (
        <Modal title="Reset access matrix"
          onClose={() => { if (!reset.isPending) setConfirmReset(false); }}
          footer={
            <>
              <SecondaryButton onClick={() => setConfirmReset(false)} disabled={reset.isPending}>Cancel</SecondaryButton>
              <PrimaryButton onClick={() => reset.mutate(undefined, { onSuccess: () => setConfirmReset(false) })} disabled={reset.isPending}>
                {reset.isPending ? "Resetting…" : "Reset to defaults"}
              </PrimaryButton>
            </>
          }>
          <p className="text-sm text-slate-700">
            All capability-role configuration for this app will be cleared. The access matrix will revert to the app&apos;s built-in defaults. This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}

// ── Change history pane ───────────────────────────────────────────────────────

function HistoryPane() {
  const { appId, httpClient } = useCtx();
  const [only, setOnly] = useState<"all" | "roles">("all");

  const userRolesQuery = useQuery<AuditListResult>({
    queryKey: keys.auditHistory("app_user_role", appId),
    queryFn: () => httpClient.get(`/orcaagents/audit?entityType=app_user_role&entityId=${appId}&limit=100`),
    staleTime: 60_000,
  });
  const customRolesQuery = useQuery<AuditListResult>({
    queryKey: keys.auditHistory("app_custom_role", appId),
    queryFn: () => httpClient.get(`/orcaagents/audit?entityType=app_custom_role&entityId=${appId}&limit=100`),
    staleTime: 60_000,
  });

  const entries = useMemo(() => {
    const userEntries = userRolesQuery.data?.entries ?? [];
    const customEntries = customRolesQuery.data?.entries ?? [];
    const merged = only === "roles" ? userEntries : [...userEntries, ...customEntries];
    return [...merged].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [userRolesQuery.data, customRolesQuery.data, only]);

  return (
    <div>
      <PaneHeader
        title="Change History"
        hint="Newest first. Entries cannot be edited or removed."
        action={
          <div className="flex overflow-hidden rounded-md border border-slate-300">
            {([ ["all", "All changes"], ["roles", "Role assignments only"] ] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setOnly(id)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  only === id ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                }`}>{label}</button>
            ))}
          </div>
        }
      />
      {entries.length === 0 ? (
        <Empty title="No changes recorded yet" hint="Role changes made in this app appear here." />
      ) : (
        <DataTable headers={["When", "Who", "Action", "Detail"]}>
          {entries.slice(0, 100).map((entry) => (
            <tr key={entry.auditId} className="hover:bg-slate-50">
              <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">{formatDateTime(entry.createdAt)}</td>
              <td className="px-3 py-2 text-slate-700">{entry.userEmail}</td>
              <td className="px-3 py-2"><Chip tone="navy">{entry.action}</Chip></td>
              <td className="px-3 py-2 text-slate-600">{describeAuditEntry(entry)}</td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}

// ── Audit pane ────────────────────────────────────────────────────────────────

const CONCERN_LABEL: Record<RoleAuditConcern, string> = {
  OVER_PRIVILEGED: "Has broader access than expected for their title and seniority",
  UNDER_PRIVILEGED: "Has narrower access than expected given their title and peers",
  UNUSUAL_FOR_TITLE: "Unusual role for this user",
};

const CONCERN_CHIP_LABEL: Record<RoleAuditConcern, string> = {
  OVER_PRIVILEGED: "Over-privileged",
  UNDER_PRIVILEGED: "Under-privileged",
  UNUSUAL_FOR_TITLE: "Unusual fit",
};

const CONCERN_TONE: Record<RoleAuditConcern, Tone> = {
  OVER_PRIVILEGED: "red",
  UNDER_PRIVILEGED: "amber",
  UNUSUAL_FOR_TITLE: "navy",
};

const AUDIT_CRITERIA_OPTIONS = [
  { key: "compareTitles" as const, title: "Title vs. role", description: "Does each person's role fit their job title and seniority level?", icon: "M4 5h16v14H4zM8 10h4M8 14h8" },
  { key: "comparePeers" as const, title: "Peer comparison", description: "Is their access in line with others on the roster?", icon: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 19a6 6 0 0 1 12 0M16 11a2.5 2.5 0 1 0 0-5M17 19h4a4.5 4.5 0 0 0-4-4.5" },
  { key: "flagNoAccess" as const, title: "Missing access", description: "Who has no role yet but probably needs one?", icon: "M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 19a6 6 0 0 1 10-4.5M18 14v6M15 17h6" },
];

const INSTRUCTION_EXAMPLES = [
  "External contractors should not have admin access",
  "Ignore service accounts",
  "All managers should have at least read access",
];

const INSTRUCTIONS_MAX = 500;

function StepHeading({ n, title, aside }: { n: number; title: string; aside?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h4 className="flex items-center gap-2.5 text-sm font-semibold text-slate-800">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-white">{n}</span>
        {title}
      </h4>
      {aside && <span className="text-xs text-slate-400">{aside}</span>}
    </div>
  );
}

function exportAuditToCsv(result: RoleAuditResult): void {
  const cell = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const headers = ["Name", "Current Role", "Concern", "Suggested Role", "Rationale"];
  const dataRows = result.findings.map((f) =>
    [f.employeeName, f.currentRole, CONCERN_CHIP_LABEL[f.concern], f.suggestedRole ?? "", f.rationale].map(cell).join(",")
  );
  const csv = [headers.map(cell).join(","), ...dataRows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "role-audit.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function AuditPane({
  subjects,
  roles,
  result,
  onResult,
  onClearAuditCount,
  onRun,
  isPending,
  error,
  isLoadingEmployees,
  auditSubjectCount,
}: {
  subjects: AuditSubject[];
  roles: { code: string; label: string }[];
  result: RoleAuditResult | undefined;
  onResult: (r: RoleAuditResult | undefined) => void;
  onClearAuditCount: () => void;
  onRun: (criteria: AuditCriteria) => Promise<RoleAuditResult>;
  isPending: boolean;
  error: string | undefined;
  isLoadingEmployees: boolean;
  auditSubjectCount: number | undefined;
}) {
  const setRole = useSetUserRole();
  const [criteria, setCriteria] = useState<AuditCriteria>(DEFAULT_AUDIT_CRITERIA);
  const [applyConfirm, setApplyConfirm] = useState<RoleAuditFinding | undefined>();
  const [ignoredKeys, setIgnoredKeys] = useState<Set<string>>(() => new Set());

  const runDisabled = isPending || isLoadingEmployees || subjects.length === 0;
  const pendingApply = setRole.isPending;
  const closeApplyConfirm = useCallback(() => { if (!pendingApply) setApplyConfirm(undefined); }, [pendingApply]);

  const selectedCount = AUDIT_CRITERIA_OPTIONS.filter((o) => criteria[o.key]).length;
  const instructions = criteria.customInstructions;
  const nothingToCheck = selectedCount === 0 && !instructions.trim();

  const appendExample = (text: string) =>
    setCriteria((c) => {
      const current = c.customInstructions.trim();
      if (current.includes(text)) return c;
      const next = current ? `${current}\n${text}` : text;
      return { ...c, customInstructions: next.slice(0, INSTRUCTIONS_MAX) };
    });

  function describeRole(code: string): string {
    if (code === "NONE") return "No role assigned";
    return roles.find((r) => r.code === code)?.label ?? code;
  }

  if (!result) {
    return (
      <div className="mx-auto max-w-3xl py-2">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-100">
            <SparkleIcon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-800">
              Audit roles with AI
              <Chip tone="navy">AI</Chip>
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Reviews the roles of the{" "}
              <span className="font-medium text-slate-700">{subjects.length} people</span> on the Users list and flags likely mismatches. Choose what to check, then run.
            </p>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <section className="p-5">
            <StepHeading n={1} title="What should it check?" aside={`${selectedCount} of ${AUDIT_CRITERIA_OPTIONS.length} selected`} />
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {AUDIT_CRITERIA_OPTIONS.map((opt) => {
                const on = criteria[opt.key];
                return (
                  <button key={opt.key} type="button" role="checkbox" aria-checked={on}
                    disabled={isPending}
                    onClick={() => setCriteria((c) => ({ ...c, [opt.key]: !c[opt.key] }))}
                    className={`relative flex flex-col items-start rounded-lg border p-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      on ? "border-indigo-300 bg-indigo-50/60 ring-1 ring-inset ring-indigo-200"
                         : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}>
                    <span className={`absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded border text-[10px] font-bold ${
                      on ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white text-transparent"
                    }`} aria-hidden>✓</span>
                    <span className={`flex h-8 w-8 items-center justify-center rounded-md ${on ? "bg-white text-indigo-600" : "bg-slate-100 text-slate-500"}`}>
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d={opt.icon} />
                      </svg>
                    </span>
                    <span className="mt-2.5 text-sm font-semibold text-slate-800">{opt.title}</span>
                    <span className="mt-0.5 text-xs leading-relaxed text-slate-500">{opt.description}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="border-t border-slate-100 p-5">
            <StepHeading n={2} title="Anything else to consider?" aside="Optional" />
            <textarea value={instructions}
              onChange={(e) => setCriteria((c) => ({ ...c, customInstructions: e.target.value.slice(0, INSTRUCTIONS_MAX) }))}
              disabled={isPending}
              placeholder='Describe your own rules in plain language, e.g. "Only HR accounts should have admin access."'
              rows={3} aria-label="Additional instructions for the audit"
              className="mt-3 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50" />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">Try:</span>
              {INSTRUCTION_EXAMPLES.map((text) => (
                <button key={text} type="button" disabled={isPending} onClick={() => appendExample(text)}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-50">
                  + {text}
                </button>
              ))}
              <span className="ml-auto text-xs tabular-nums text-slate-400">{instructions.length}/{INSTRUCTIONS_MAX}</span>
            </div>
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-5 py-4">
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <span className="mr-1">You&apos;ll get findings tagged</span>
              {(Object.keys(CONCERN_CHIP_LABEL) as RoleAuditConcern[]).map((concern) => (
                <span key={concern} title={CONCERN_LABEL[concern]}>
                  <Chip tone={CONCERN_TONE[concern]}>{CONCERN_CHIP_LABEL[concern]}</Chip>
                </span>
              ))}
            </div>
            <div className="flex flex-col items-end gap-1">
              <button type="button" onClick={() => onRun(criteria)} disabled={runDisabled || nothingToCheck}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                {isPending ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
                ) : (
                  <SparkleIcon className="h-4 w-4" />
                )}
                {isPending ? `Auditing ${subjects.length} people…` : "Run audit"}
              </button>
              {nothingToCheck && <span className="text-xs text-slate-400">Pick a check or add an instruction</span>}
              {isLoadingEmployees && !isPending && <span className="text-xs text-slate-400">Loading employee profiles…</span>}
            </div>
          </footer>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-xs text-red-700 ring-1 ring-inset ring-red-200">{error}</p>
        )}

        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-400">
          <svg viewBox="0 0 16 16" className="mt-px h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 7.2V11M8 5v.01" strokeLinecap="round" />
          </svg>
          Suggestions only — nobody&apos;s access changes until you apply a finding yourself, and each one asks for confirmation. Employee profile data (name, title, department) is sent to the AI model for analysis. AI can be wrong; you can ignore any finding.
        </p>
      </div>
    );
  }

  const visible = result.findings.filter((f) => !ignoredKeys.has(`${f.employeeId}-${f.concern}`));

  return (
    <div>
      <PaneHeader
        title="Audit Roles"
        hint="AI review of each person's role. Suggestions only."
        action={
          <div className="flex gap-2">
            <SecondaryButton onClick={() => exportAuditToCsv(result)}>Export CSV</SecondaryButton>
            <SecondaryButton onClick={() => { onResult(undefined); onClearAuditCount(); }}>Clear</SecondaryButton>
            <PrimaryButton onClick={() => onRun(criteria)} disabled={runDisabled}>
              <span className="inline-flex items-center gap-2">
                <SparkleIcon className={`h-4 w-4 ${isPending ? "animate-pulse" : ""}`} />
                {isPending ? "Auditing…" : "Run again"}
              </span>
            </PrimaryButton>
          </div>
        }
      />

      <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-sm leading-relaxed text-slate-700">
        {result.summary}
      </div>

      {auditSubjectCount !== undefined && auditSubjectCount !== subjects.length && (
        <p className="mt-3 rounded-lg bg-amber-50 px-4 py-2.5 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
          The roster has changed since this audit ran ({auditSubjectCount} to {subjects.length} people). Run again for up-to-date results.
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-2.5 text-xs text-red-700 ring-1 ring-inset ring-red-200">{error}</p>
      )}

      {visible.length === 0 ? (
        <div className="mt-3">
          <Empty
            title={result.findings.length === 0 ? "No mismatches found" : "All findings resolved"}
            hint={result.findings.length === 0
              ? "Every role looks appropriate given the current roster."
              : "You've applied or ignored every finding. Run again to refresh."}
          />
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {visible.map((f) => (
            <li key={`${f.employeeId}-${f.concern}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={f.employeeName} size={36} />
                  <div>
                    <p className="font-semibold text-slate-800">{f.employeeName}</p>
                    <p className="text-sm text-slate-500">{describeRole(f.currentRole)}</p>
                  </div>
                </div>
                <span title={CONCERN_LABEL[f.concern]}>
                  <Chip tone={CONCERN_TONE[f.concern]}>{CONCERN_CHIP_LABEL[f.concern]}</Chip>
                </span>
              </div>
              {f.rationale && <p className="mt-3 text-sm leading-relaxed text-slate-600">{f.rationale}</p>}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <span className="rounded-md bg-white px-2.5 py-1 ring-1 ring-slate-200">{describeRole(f.currentRole)}</span>
                  {f.suggestedRole && (
                    <>
                      <span className="text-slate-400">→</span>
                      <span className="rounded-md bg-white px-2.5 py-1 ring-1 ring-slate-200">
                        {f.suggestedRole === "NONE" ? "Remove access" : describeRole(f.suggestedRole)}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <SecondaryButton onClick={() => setIgnoredKeys((prev) => new Set([...prev, `${f.employeeId}-${f.concern}`]))}>Ignore</SecondaryButton>
                  {f.suggestedRole && (
                    <PrimaryButton onClick={() => setApplyConfirm(f)} disabled={setRole.isPending}>Apply suggestion</PrimaryButton>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {applyConfirm && (
        <Modal title="Apply role suggestion" onClose={closeApplyConfirm} footer={
          <>
            <SecondaryButton onClick={() => setApplyConfirm(undefined)} disabled={setRole.isPending}>Cancel</SecondaryButton>
            <PrimaryButton
              onClick={() => {
                const f = applyConfirm;
                setRole.mutate({ email: f.employeeId, roleCode: f.suggestedRole! }, {
                  onSuccess: () => {
                    onResult({ ...result, findings: result.findings.filter((x) => !(x.employeeId === f.employeeId && x.concern === f.concern)) });
                    setApplyConfirm(undefined);
                  },
                });
              }}
              disabled={setRole.isPending}>
              {setRole.isPending ? "Applying…" : "Apply"}
            </PrimaryButton>
          </>
        }>
          <p className="text-sm text-slate-700">
            Change <span className="font-semibold">{applyConfirm.employeeName}</span>&apos;s role from{" "}
            <span className="font-semibold">{describeRole(applyConfirm.currentRole)}</span> to{" "}
            <span className="font-semibold">{describeRole(applyConfirm.suggestedRole!)}</span>? Their access changes immediately.
          </p>
          {applyConfirm.rationale && <p className="mt-2 text-xs text-slate-500">{applyConfirm.rationale}</p>}
          {applyConfirm.suggestedRole === "NONE" && (
            <p className="mt-2 text-xs text-amber-700">No Access removes every capability — they will no longer be able to use this app.</p>
          )}
        </Modal>
      )}
    </div>
  );
}
