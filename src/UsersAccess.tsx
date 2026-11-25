import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Checkbox, Input, Space } from "antd";
import { Avatar as UIAvatar } from "./Avatar";
import { Button as UIButton } from "./Button";
import { Chip as UIChip } from "./Chip";
import { EmptyState } from "./EmptyState";
import { Modal as UIModal } from "./Modal";
import { Select as UISelect } from "./Select";
import { LIGHT_SURFACE, LIGHT_TONES, type Tone } from "./palette";
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

/** HTTP client adapter. All methods must reject (throw) on non-2xx responses. */
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
  /** Open a specific tab on mount. Defaults to "users". */
  initialPane?: "users" | "matrix" | "history" | "audit";
}

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
  userInfo: () => ["auth", "userinfo"] as const,
  workspaceUsers: () => ["access", "users", "all"] as const,
};

// ── API shapes ────────────────────────────────────────────────────────────────

/**
 * One row in the backend's `workspace_app_user_role` table — a single
 * (user, role, department, cost-center) GRANT, not a user. A user with
 * multiple grants shows up as multiple rows.
 *
 * Empty string on `departmentCode`/`costCenterCode` is the legacy wildcard
 * sentinel (any dept / any cost center); see `WILDCARD_SCOPE` below.
 */
interface UserAppRoleGrantRow {
  userEmail: string;
  roleCode: string;
  departmentCode?: string;
  costCenterCode?: string;
  updatedAt: string;
}

// Legacy wildcard scope sentinel: an empty-string departmentCode or
// costCenterCode means "any". Used when migrating pre-cost-center rows and
// when AuditPane applies a role without a specific scope.
const WILDCARD_SCOPE = "";
interface AppCustomRole { code: string; label: string }
interface CapabilityRole { capabilityCode: string; roleCode: string }
interface HrRole { code: string; label: string }
interface Employee {
  workEmail: string;
  firstName?: string;
  lastName?: string;
  departmentCode?: string;
  hireDate?: string;
  costCenterCode?: string | null;
  customAttributes?: Record<string, unknown>;
}
interface EmployeeListResult { items: Employee[]; totalCount: number }
interface UserInfoResponse {
  isAdmin: boolean;
  roles?: string[];
}
interface AccessUserAccount {
  email?: string;
}
interface AccessUserCustomer {
  userAccount?: AccessUserAccount | null;
}
interface SearchUsersResponse {
  items: AccessUserCustomer[];
}
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
  return useQuery<UserAppRoleGrantRow[]>({
    queryKey: keys.userRoles(appId),
    queryFn: () => httpClient.get(`/orcaagents/approles/apps/${appId}/user-roles`),
    enabled: !!appId,
  });
}

interface UserAppRoleGrant {
  roleCode: string;
  departmentCode: string;
  costCenterCode: string;
}

// Atomic multi-grant replace. Sends the full grants list — the backend
// rewrites workspace_app_user_role rows and ReBAC bridges to match.
function useReplaceUserGrants() {
  const { appId, httpClient } = useCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, grants }: { email: string; grants: UserAppRoleGrant[] }) =>
      httpClient.put(
        `/orcaagents/approles/apps/${appId}/user-roles/${encodeURIComponent(email)}`,
        { grants }
      ),
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
      httpClient.delete(`/orcaagents/approles/apps/${appId}/custom-roles/${encodeURIComponent(code)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.customRoles(appId) }),
  });
}

// Custom role codes must be strict identifiers: uppercase letters, digits,
// and underscores only. This matches the server-side normalisation and
// prevents URL-path traversal via characters like / . % ? #.
const CUSTOM_ROLE_CODE_RE = /^[A-Z0-9_]{1,64}$/;

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
      httpClient.put(`/orcaagents/approles/apps/${appId}/capability-roles/${encodeURIComponent(capabilityCode)}/${encodeURIComponent(roleCode)}`, {}),
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
      httpClient.delete(`/orcaagents/approles/apps/${appId}/capability-roles/${encodeURIComponent(capabilityCode)}/${encodeURIComponent(roleCode)}`),
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
  const { appId, httpClient } = useCtx();
  return useQuery<HrRole[]>({
    queryKey: keys.hrRoles(),
    queryFn: () => httpClient.get("/orcaagents/hrglobalroles/roles"),
    enabled: !!appId,
    staleTime: 5 * 60_000,
  });
}

async function fetchAllEmployees(httpClient: HttpClient): Promise<{ items: Employee[]; truncated: boolean }> {
  const first = await httpClient.get<EmployeeListResult>(
    "/orcaagents/headcount/employees?page=1&pageSize=100"
  );
  if (!first?.items) return { items: [], truncated: false };
  // Cap at 50 pages (5,000 employees) to bound latency and memory usage.
  const totalPages = Math.min(Math.ceil(first.totalCount / 100), 50);
  const truncated = first.totalCount > 5000;
  if (totalPages <= 1) return { items: [...first.items], truncated };
  // Fire the remaining pages concurrently (with a small cap) instead of
  // serially — at 5,000 employees a serial loop was 50 sequential round-trips.
  const concurrency = 5;
  const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
  const results = new Array<EmployeeListResult | undefined>(remaining.length);
  let cursor = 0;
  async function worker() {
    while (cursor < remaining.length) {
      const idx = cursor++;
      const p = remaining[idx];
      try {
        results[idx] = await httpClient.get<EmployeeListResult>(
          `/orcaagents/headcount/employees?page=${p}&pageSize=100`
        );
      } catch {
        // One bad page shouldn't lose the whole roster.
        results[idx] = undefined;
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, remaining.length) }, () => worker())
  );
  const all = [...first.items];
  for (const page of results) {
    if (page?.items) all.push(...page.items);
  }
  return { items: all, truncated };
}

function useAllEmployees() {
  const { httpClient } = useCtx();
  return useQuery<{ items: Employee[]; truncated: boolean }>({
    queryKey: keys.employees(),
    queryFn: () => fetchAllEmployees(httpClient),
    staleTime: 5 * 60_000,
  });
}

// Fetches the current user's identity to gate the entire UI on admin status.
// Non-admins see a friendly message instead of the full admin surface.
function useUserInfo() {
  const { httpClient } = useCtx();
  return useQuery<UserInfoResponse>({
    queryKey: keys.userInfo(),
    queryFn: () => httpClient.get<UserInfoResponse>("/orcaagents/auth/userinfo"),
    staleTime: 5 * 60_000,
  });
}

// Fetches workspace user accounts (people who can actually log in) — used to
// filter out employee records without linked accounts. Cursor-paginated; we
// pull every page since the admin list is usually small (<500 users).
async function fetchAllWorkspaceUsers(
  httpClient: HttpClient
): Promise<AccessUserCustomer[]> {
  const all: AccessUserCustomer[] = [];
  let pageKey: string | undefined;
  // Cap at 40 pages × 100 (4000 users) to bound latency.
  for (let i = 0; i < 40; i++) {
    const resp = await httpClient.post<SearchUsersResponse & { pageKey?: string }>(
      "/orcaagents/access/users/search",
      { filters: [], size: 100, pageKey }
    );
    if (!resp?.items?.length) break;
    all.push(...resp.items);
    if (!resp.pageKey) break;
    pageKey = resp.pageKey;
  }
  return all;
}

function useWorkspaceUsers() {
  const { httpClient } = useCtx();
  return useQuery<AccessUserCustomer[]>({
    queryKey: keys.workspaceUsers(),
    queryFn: () => fetchAllWorkspaceUsers(httpClient),
    staleTime: 5 * 60_000,
  });
}

// ── Inline UI helpers ─────────────────────────────────────────────────────────

function nameList(names: string[], max = 3): string {
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} and ${names.length - max} more`;
}

function RailItem({ label, icon, count, on, onClick }: {
  label: string; icon?: ReactNode; count?: number; on: boolean; onClick: () => void;
}) {
  const base: CSSProperties = {
    display: "flex",
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    padding: "8px 12px",
    textAlign: "left",
    fontSize: 14,
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    transition: "background-color 120ms, color 120ms",
    background: on ? LIGHT_SURFACE.surface : "transparent",
    color: on ? LIGHT_SURFACE.brand : LIGHT_SURFACE.ink2,
    fontWeight: on ? 500 : 400,
    boxShadow: on ? `0 1px 2px rgba(27, 26, 23, 0.04), inset 0 0 0 1px ${LIGHT_SURFACE.line}` : undefined,
  };
  return (
    <button type="button" onClick={onClick} style={base}>
      <span style={{ display: "inline-flex", minWidth: 0, alignItems: "center", gap: 6 }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        {icon && <span style={{ color: LIGHT_SURFACE.brand, display: "inline-flex" }}>{icon}</span>}
      </span>
      {count !== undefined && (
        <span style={{
          flexShrink: 0,
          borderRadius: 999,
          padding: "0 6px",
          fontSize: 11,
          fontVariantNumeric: "tabular-nums",
          background: on ? LIGHT_TONES.info.tint : LIGHT_SURFACE.line,
          color: on ? LIGHT_SURFACE.brand : LIGHT_SURFACE.ink2,
        }}>{count}</span>
      )}
    </button>
  );
}

function SparkleIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M10 2.5c.4 0 .7.3.8.7l.9 3.6a5 5 0 0 0 3.6 3.6l3.6.9a.8.8 0 0 1 0 1.6l-3.6.9a5 5 0 0 0-3.6 3.6l-.9 3.6a.8.8 0 0 1-1.6 0l-.9-3.6a5 5 0 0 0-3.6-3.6l-3.6-.9a.8.8 0 0 1 0-1.6l3.6-.9a5 5 0 0 0 3.6-3.6l.9-3.6c.1-.4.4-.7.8-.7Z" />
      <path d="M19 1.5c.2 0 .4.1.4.3l.4 1.4a2 2 0 0 0 1.4 1.4l1.4.4a.4.4 0 0 1 0 .8l-1.4.4a2 2 0 0 0-1.4 1.4l-.4 1.4a.4.4 0 0 1-.8 0l-.4-1.4a2 2 0 0 0-1.4-1.4l-1.4-.4a.4.4 0 0 1 0-.8l1.4-.4a2 2 0 0 0 1.4-1.4l.4-1.4c0-.2.2-.3.4-.3Z" />
    </svg>
  );
}

function PaneHeader({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div style={{
      marginBottom: 12,
      display: "flex",
      flexWrap: "wrap",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 12,
    }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: LIGHT_SURFACE.ink }}>{title}</h3>
        {hint && <p style={{ margin: "2px 0 0", fontSize: 12, color: LIGHT_SURFACE.ink2 }}>{hint}</p>}
      </div>
      {action}
    </div>
  );
}

function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: LIGHT_SURFACE.ink }}>{children}</h2>
      {hint && <p style={{ margin: "2px 0 0", fontSize: 12, color: LIGHT_SURFACE.ink2 }}>{hint}</p>}
    </div>
  );
}

function BasicTable({ headers, children, minWidth }: {
  headers: ReactNode[];
  children: ReactNode;
  minWidth?: number | string;
}) {
  return (
    <div style={{
      overflow: "auto",
      borderRadius: 10,
      border: `1px solid ${LIGHT_SURFACE.line}`,
      background: LIGHT_SURFACE.surface,
    }}>
      <table style={{ width: "100%", minWidth: minWidth ?? "max-content", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${LIGHT_SURFACE.line}`, background: LIGHT_SURFACE.canvas, textAlign: "left" }}>
            {headers.map((header, i) => (
              <th
                key={i}
                scope="col"
                style={{
                  padding: "8px 6px",
                  verticalAlign: "bottom",
                  fontSize: 11,
                  fontWeight: 600,
                  lineHeight: 1.1,
                  color: LIGHT_SURFACE.ink2,
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

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
  initialPane,
}: UsersAccessProps) {
  return (
    <UsersAccessCtx.Provider value={{ appId, httpClient, currentUserEmail, auditRoles }}>
      <AdminGate>
        <UsersAccessInner
          roles={roles}
          capabilities={capabilities}
          onCapabilityRolesChanged={onCapabilityRolesChanged}
          initialPane={initialPane}
        />
      </AdminGate>
    </UsersAccessCtx.Provider>
  );
}

/**
 * Legacy capability code that used to unlock Users & Access per app role. The
 * page is now workspace-admin only, so it is filtered out of the matrix.
 */
const MANAGE_USERS_CAPABILITY = "MANAGE_USERS";

const WORKSPACE_ADMIN_ROLES = ["CUSTOMER_ADMIN", "SYSTEM_ADMIN"];

/** Customer or system admin — the same rule the host's useUserInfo applies. */
function isWorkspaceAdmin(info: UserInfoResponse | undefined): boolean {
  if (!info) return false;
  return info.isAdmin === true || (info.roles ?? []).some((r) => WORKSPACE_ADMIN_ROLES.includes(r));
}

// Admins only. Backend already enforces this on write; the gate just avoids
// showing a non-admin a UI they can't use (and the resulting 403 errors).
function AdminGate({ children }: { children: ReactNode }) {
  const { data: info, isLoading, isError, refetch, isFetching } = useUserInfo();
  const panel: CSSProperties = {
    borderRadius: 10,
    border: `1px solid ${LIGHT_SURFACE.line}`,
    background: LIGHT_SURFACE.surface,
    padding: "40px 24px",
    textAlign: "center",
  };
  if (isLoading) {
    return (
      <div style={{ ...panel, fontSize: 14, color: LIGHT_SURFACE.ink2 }}>
        Loading…
      </div>
    );
  }
  if (isError) {
    return (
      <div style={panel}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: LIGHT_SURFACE.ink }}>
          Couldn&apos;t verify admin access
        </p>
        <p style={{ margin: "4px 0 12px", fontSize: 12, color: LIGHT_SURFACE.ink2 }}>
          We couldn&apos;t check your access level — this is usually a transient
          network issue. Try again.
        </p>
        <UIButton variant="secondary" size="sm" onClick={() => refetch()} loading={isFetching}>
          {isFetching ? "Checking…" : "Retry"}
        </UIButton>
      </div>
    );
  }
  if (!isWorkspaceAdmin(info)) {
    return (
      <div style={panel}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: LIGHT_SURFACE.ink }}>
          Admin access required
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: LIGHT_SURFACE.ink2 }}>
          Only workspace administrators can view and manage user access for this app.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

function UsersAccessInner({
  roles,
  capabilities,
  onCapabilityRolesChanged,
  initialPane,
}: {
  roles: UsersAccessProps["roles"];
  capabilities: UsersAccessProps["capabilities"];
  onCapabilityRolesChanged?: () => void;
  initialPane?: UsersAccessProps["initialPane"];
}) {
  const { appId, httpClient, auditRoles } = useCtx();
  const [pane, setPane] = useState<Pane>(initialPane ?? "users");
  const { data: assignments = [], isError: rolesError } = useUserRoles();
  const { data: allEmployeesData, isLoading: isLoadingEmployees, isError: employeesError } = useAllEmployees();
  const allWorkspaceEmployees = useMemo<Employee[]>(() => allEmployeesData?.items ?? [], [allEmployeesData]);

  // The roster is exactly the current workspace users (people with login
  // accounts). Assignment rows for emails that are no longer workspace users
  // (ghosts from deleted accounts) are hidden here — they can be purged via
  // the trash icon. Employee records are used only for enrichment.
  const { data: workspaceUsers = [] } = useWorkspaceUsers();
  const employeeByEmail = useMemo(() => {
    const m = new Map<string, Employee>();
    for (const e of allWorkspaceEmployees) {
      if (e.workEmail) m.set(e.workEmail.toLowerCase(), e);
    }
    return m;
  }, [allWorkspaceEmployees]);
  const mergedAssignments = useMemo(() => {
    // Multi-grant: users can have N rows (one per (role, cost_center)).
    // Group them so the chip-rendering code can show every grant.
    const assignmentsByEmail = new Map<string, UserAppRoleGrantRow[]>();
    for (const a of assignments) {
      const key = a.userEmail.toLowerCase();
      const list = assignmentsByEmail.get(key);
      if (list) {
        list.push(a);
      } else {
        assignmentsByEmail.set(key, [a]);
      }
    }
    const result: UserAppRoleGrantRow[] = [];
    for (const wsUser of workspaceUsers) {
      const email = wsUser.userAccount?.email;
      if (!email) continue;
      const key = email.toLowerCase();
      const existing = assignmentsByEmail.get(key);
      if (existing && existing.length > 0) {
        result.push(...existing);
      } else {
        const emp = employeeByEmail.get(key);
        result.push({
          userEmail: email,
          roleCode: "NONE",
          costCenterCode: emp?.costCenterCode ?? "",
          updatedAt: "",
        });
      }
    }
    return result;
  }, [assignments, workspaceUsers, employeeByEmail]);

  const [auditResult, setAuditResult] = useState<RoleAuditResult | undefined>();
  const auditAbortRef = useRef<AbortController | null>(null);
  const auditTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => {
    clearTimeout(auditTimeoutRef.current);
    auditAbortRef.current?.abort();
  }, []);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // Users & Access is workspace-admin only, so no app role "can change access" —
  // drop a legacy MANAGE_USERS capability so it never shows up as a matrix row.
  const matrixCapabilities = useMemo(
    () => capabilities?.filter((c) => c.code !== MANAGE_USERS_CAPABILITY),
    [capabilities]
  );

  // With multi-grant, mergedAssignments is one row per (user, role, cost center)
  // grant. Summary works at user granularity: unique users with any grant and
  // distinct roles in use across all grants.
  const { withAccessUsers, totalUsers, rolesInUse } = useMemo(() => {
    const allEmails = new Set(mergedAssignments.map((a) => a.userEmail.toLowerCase()));
    const realGrants = mergedAssignments.filter((a) => a.roleCode && a.roleCode !== "NONE");
    const withAccess = new Set(realGrants.map((a) => a.userEmail.toLowerCase()));
    return {
      withAccessUsers: withAccess.size,
      totalUsers: allEmails.size,
      rolesInUse: new Set(realGrants.map((a) => a.roleCode)).size,
    };
  }, [mergedAssignments]);

  const summary = `${withAccessUsers} of ${totalUsers} ${
    totalUsers === 1 ? "person has" : "people have"
  } access, in ${rolesInUse} ${rolesInUse === 1 ? "role" : "roles"}. Only workspace admins can change access.`;

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

  const runAudit = useCallback(async (criteria: AuditCriteria): Promise<RoleAuditResult | undefined> => {
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
    } finally {
      clearTimeout(timeoutId);
      auditTimeoutRef.current = undefined;
      if (mountedRef.current && auditAbortRef.current === controller) {
        setAuditPending(false);
      }
    }
  }, [auditRoles, subjects, roles]);

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

  const showMatrix = matrixCapabilities !== undefined && matrixCapabilities.length > 0;
  const showAudit = auditRoles !== undefined;
  const rosterTruncated = allEmployeesData?.truncated ?? false;

  const shown: Pane =
    pane === "matrix" && !showMatrix ? "users"
    : pane === "audit" && !showAudit ? "users"
    : pane;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionTitle hint={summary}>Users & Access</SectionTitle>
      {rosterTruncated && (
        <div style={{
          borderRadius: 10,
          background: LIGHT_TONES.warning.tint,
          color: LIGHT_TONES.warning.fg,
          padding: "8px 12px",
          fontSize: 12,
          boxShadow: `inset 0 0 0 1px ${LIGHT_TONES.warning.dot}33`,
        }}>
          Showing the first 5,000 employees. Your full roster is larger — some users may not appear.
        </div>
      )}

      <div style={{
        overflow: "hidden",
        borderRadius: 10,
        border: `1px solid ${LIGHT_SURFACE.line}`,
        background: LIGHT_SURFACE.surface,
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "200px minmax(0, 1fr)" }}>
          <nav style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: 8,
            borderRight: `1px solid ${LIGHT_SURFACE.line}`,
            background: LIGHT_SURFACE.canvas,
          }}>
            <RailItem label="Users" count={totalUsers}
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
                icon={<SparkleIcon size={14} />}
                count={auditResult ? auditResult.findings.length : undefined}
                on={shown === "audit"}
                onClick={() => setPane("audit")}
              />
            )}
          </nav>

          <div style={{ minWidth: 0, padding: 16 }}>
            {shown === "users" && (
              <UsersPane roles={roles} assignments={mergedAssignments} isError={rolesError || employeesError} />
            )}
            {shown === "matrix" && showMatrix && (
              <MatrixPane
                capabilities={matrixCapabilities}
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
  isError,
}: {
  roles: { code: string; label: string }[];
  assignments: UserAppRoleGrantRow[];
  isError: boolean;
}) {
  const { currentUserEmail } = useCtx();
  const replaceGrants = useReplaceUserGrants();
  const { data: hrRoles = [] } = useHrRoles();
  const { data: customRoles = [] } = useCustomRoles();
  const { data: allEmployeesRaw, isLoading: empLoading } = useAllEmployees();
  const allEmployees = useMemo<Employee[]>(() => allEmployeesRaw?.items ?? [], [allEmployeesRaw]);

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
  const [confirming, setConfirming] = useState(false);
  // Which user's grants panel is open. Email identifies the row; null closes.
  const [managingEmail, setManagingEmail] = useState<string | null>(null);
  const [bulkPending, setBulkPending] = useState(false);
  // Which orphan user is pending purge via the trash button. The button
  // sets this; the modal does the actual mutate when confirmed.
  const [purgingEmail, setPurgingEmail] = useState<string | null>(null);
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

  // Group flat (user, role, cost center) rows into one entry per user with a
  // list of their grants. "No Access" users (no real role) still show up but
  // with an empty grants list, so admins can assign something.
  interface UserRow { userEmail: string; grants: UserAppRoleGrantRow[] }
  const orderedUsers = useMemo<UserRow[]>(() => {
    const byEmail = new Map<string, UserRow>();
    const order: string[] = [];
    for (const a of ordered) {
      const key = a.userEmail.toLowerCase();
      let row = byEmail.get(key);
      if (!row) {
        row = { userEmail: a.userEmail, grants: [] };
        byEmail.set(key, row);
        order.push(key);
      }
      // Skip "empty" rows — those are the padded "No Access" placeholders
      // from the parent merge. A real grant has a non-empty role code.
      if (a.roleCode && a.roleCode !== "NONE") row.grants.push(a);
    }
    return order.map((k) => byEmail.get(k)!);
  }, [ordered]);

  const employeeMap = useMemo(() => {
    const m = new Map<string, { name: string; title: string; group: string; jobFamily: string; location: string; costCenter: string }>();
    for (const e of allEmployees) {
      const a = e.customAttributes ?? {};
      const str = (v: unknown) => (typeof v === "string" ? v : "");
      m.set(e.workEmail.toLowerCase(), {
        name: `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim() || e.workEmail,
        title: str(a.job_title),
        group: e.departmentCode ?? "",
        jobFamily: str(a.job_family),
        location: str(a.job_location),
        costCenter: e.costCenterCode ?? "",
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

  // Department + cost center options for the add-role form.
  //
  // Your data doesn't have a separate departments master table. Instead,
  // employees.department_code holds values like "301 - Product - Exec",
  // where "Product" is the semantic department. We derive the department
  // dropdown by parsing the middle segment of each distinct code, and the
  // cost-center dropdown by grouping the full codes under their parsed dept.
  //
  // So for a user, picking Dept = "Product" shows CCs:
  //   301 - Product - Exec
  //   302 - Product - Design
  //   ...
  //   305 - Product - SEO
  //
  // Picking 0 CCs means "all CCs in Product" — on save we expand to N grants
  // (one per CC in that dept) so every grant row references a real dept code
  // that ReBAC can resolve back to employees.
  const parseDept = (code: string): string => {
    const parts = code.split(" - ");
    const name = (parts.length >= 2 ? parts[1] : code).trim();
    // Any malformed/empty department degenerates to a sentinel so the dropdown
    // filter and the grouping below drop these rows instead of collecting them
    // under an invisible "" bucket.
    return name || "";
  };

  const allDeptCodes = useMemo(
    () =>
      [...new Set(allEmployees.map((e) => e.departmentCode ?? "").filter(Boolean))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [allEmployees]
  );

  const costCentersByDept = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const full of allDeptCodes) {
      const dept = parseDept(full);
      // Guard: an empty parsed department name becomes an invisible dropdown
      // entry, so skip it. The original full code is still available on the
      // grant row itself.
      if (!dept) continue;
      const list = m.get(dept);
      if (list) list.push(full); else m.set(dept, [full]);
    }
    for (const list of m.values()) list.sort((a, b) => a.localeCompare(b));
    return m;
  }, [allDeptCodes]);

  const departmentOptions = useMemo(
    () => [...costCentersByDept.keys()].sort((a, b) => a.localeCompare(b)),
    [costCentersByDept]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orderedUsers.filter((u) => {
      const emp = employeeMap.get(u.userEmail.toLowerCase());
      const name = emp?.name.toLowerCase() ?? "";
      const title = emp?.title.toLowerCase() ?? "";
      const roleMatch = !filterRole
        || (filterRole === "NONE" && u.grants.length === 0)
        || u.grants.some((g) => g.roleCode === filterRole);
      return (
        (!q || u.userEmail.toLowerCase().includes(q) || name.includes(q) || title.includes(q)) &&
        roleMatch &&
        (!filterGroup || emp?.group === filterGroup) &&
        (!filterFamily || emp?.jobFamily === filterFamily) &&
        (!filterLocation || emp?.location === filterLocation)
      );
    });
  }, [orderedUsers, query, filterRole, filterGroup, filterFamily, filterLocation, employeeMap]);

  const filterKey = [query, filterRole, filterGroup, filterFamily, filterLocation].join("\0");
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const selectable = useMemo(
    () => filtered.filter((u) => u.userEmail.toLowerCase() !== currentUserEmail.toLowerCase()),
    [filtered, currentUserEmail]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paged = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const validSelected = useMemo(() => {
    const visible = new Set(selectable.map((u) => u.userEmail));
    return new Set([...selected].filter((id) => visible.has(id)));
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
    setSelected(allSelected ? new Set() : new Set(selectable.map((u) => u.userEmail)));

  const closeConfirm = useCallback(() => { if (!bulkPending) setConfirming(false); }, [bulkPending]);

  // Bulk apply now operates on users: "Clear all" wipes every selected user's
  // grants (equivalent to the old "No Access"). Adding a specific role in bulk
  // requires cost-center selection per user which is out of scope — admins
  // add roles one-user-at-a-time via the per-row Add popover.
  //
  // Writes fan out with a small concurrency cap so a 500-user bulk clear
  // doesn't flood the backend with simultaneous PUTs.
  async function applyBulkClear() {
    const snapshot = [...validSelected];
    if (snapshot.length === 0) { setConfirming(false); return; }
    setBulkPending(true);
    const concurrency = 5;
    const failures: string[] = [];
    let cursor = 0;
    async function worker() {
      while (cursor < snapshot.length) {
        const index = cursor++;
        const email = snapshot[index];
        try {
          await replaceGrants.mutateAsync({ email, grants: [] });
        } catch {
          failures.push(email);
        }
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(concurrency, snapshot.length) }, () => worker())
    );
    if (!mountedRef.current) return;
    setBulkPending(false);
    setConfirming(false);
    if (failures.length === 0) {
      setNotice(`${snapshot.length} ${snapshot.length === 1 ? "person" : "people"} cleared.`);
      setSelected(new Set());
    } else {
      setNotice(
        `${snapshot.length - failures.length} of ${snapshot.length} cleared; ${failures.length} failed (${nameList(failures)}).`
      );
    }
  }

  const filtersOn = query.trim() !== "" || filterRole !== "" || filterGroup !== "" || filterFamily !== "" || filterLocation !== "";

  const roleFilterOptions = [
    { value: "", label: "All roles" },
    { value: "NONE", label: "— No access —" },
    ...(hrRoles.length > 0
      ? [{ label: "HR Global Roles", options: hrRoles.map((r) => ({ value: r.code, label: r.label })) }]
      : []),
    ...(appOnlyRoles.length > 0
      ? [{ label: "App Roles", options: appOnlyRoles.map((r) => ({ value: r.code, label: r.label })) }]
      : []),
    ...(customRoles.length > 0
      ? [{ label: "Custom Roles", options: customRoles.map((r) => ({ value: r.code, label: r.label })) }]
      : []),
  ];

  return (
    <div>
      <PaneHeader
        title="Users"
        hint="Everyone in your workspace. Assign a role to grant access, or set to No Access to remove it."
      />

      {isError && (
        <div style={{
          marginBottom: 12,
          borderRadius: 10,
          background: LIGHT_TONES.danger.tint,
          color: LIGHT_TONES.danger.fg,
          padding: "8px 12px",
          fontSize: 14,
          boxShadow: `inset 0 0 0 1px ${LIGHT_TONES.danger.dot}33`,
        }}>
          Failed to load users — check your connection and try refreshing.
        </div>
      )}

      <div style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <Input.Search
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or title…"
          aria-label="Search users"
          allowClear
          style={{ width: 224 }}
        />
        <div style={{ width: 200 }}>
          <UISelect
            value={filterRole}
            onChange={(v) => setFilterRole(v)}
            placeholder="All roles"
            allowClear
            options={roleFilterOptions as never}
          />
        </div>
        {options.groups.length > 0 && (
          <div style={{ width: 200 }}>
            <UISelect
              value={filterGroup}
              onChange={(v) => setFilterGroup(v)}
              placeholder="All groups"
              allowClear
              options={options.groups.map((g) => ({ value: g, label: g }))}
            />
          </div>
        )}
        {options.families.length > 0 && (
          <div style={{ width: 200 }}>
            <UISelect
              value={filterFamily}
              onChange={(v) => setFilterFamily(v)}
              placeholder="All job families"
              allowClear
              options={options.families.map((f) => ({ value: f, label: f }))}
            />
          </div>
        )}
        {options.locations.length > 0 && (
          <div style={{ width: 200 }}>
            <UISelect
              value={filterLocation}
              onChange={(v) => setFilterLocation(v)}
              placeholder="All locations"
              allowClear
              options={options.locations.map((l) => ({ value: l, label: l }))}
            />
          </div>
        )}
        {filtersOn && (
          <UIButton
            variant="link"
            size="sm"
            onClick={() => { setQuery(""); setFilterRole(""); setFilterGroup(""); setFilterFamily(""); setFilterLocation(""); }}
          >
            Clear filters
          </UIButton>
        )}
        <span style={{ marginLeft: "auto", fontSize: 12, color: LIGHT_SURFACE.ink2 }}>
          {filtersOn
            ? `${filtered.length} of ${orderedUsers.length} people match`
            : `${orderedUsers.length} people`}
        </span>
      </div>

      {validSelected.size > 0 && (
        <div style={{
          marginBottom: 12,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          borderRadius: 10,
          border: `1px solid ${LIGHT_TONES.info.dot}55`,
          background: LIGHT_TONES.info.tint,
          padding: "8px 12px",
          fontSize: 14,
        }}>
          <span style={{ fontWeight: 500, color: LIGHT_SURFACE.ink }}>
            {allSelected && selectable.length > PAGE_SIZE
              ? `All ${validSelected.size} ${filtersOn ? "matching " : ""}people selected`
              : `${validSelected.size} selected`}
          </span>
          <span style={{ color: LIGHT_SURFACE.line }}>|</span>
          <UIButton variant="primary" size="sm" onClick={() => setConfirming(true)} disabled={bulkPending}>
            {bulkPending ? "Clearing…" : `Clear all roles for ${validSelected.size}`}
          </UIButton>
          <UIButton
            variant="link"
            size="sm"
            onClick={() => setSelected(new Set())}
            style={{ marginLeft: "auto" }}
          >
            Clear selection
          </UIButton>
        </div>
      )}

      {notice && validSelected.size === 0 && (
        <div style={{
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          borderRadius: 10,
          background: LIGHT_TONES.success.tint,
          color: LIGHT_TONES.success.fg,
          padding: "8px 12px",
          fontSize: 14,
          boxShadow: `inset 0 0 0 1px ${LIGHT_TONES.success.dot}33`,
        }}>
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(undefined)}
            aria-label="Dismiss"
            style={{
              all: "unset",
              cursor: "pointer",
              color: LIGHT_TONES.success.dot,
              fontSize: 14,
            }}
          >✕</button>
        </div>
      )}

      {orderedUsers.length === 0 ? (
        <EmptyState icon={null} title="No employees found" />
      ) : (
        <BasicTable
          headers={[
            <Checkbox
              key="all"
              checked={allSelected}
              indeterminate={someSelected}
              onChange={toggleAll}
              disabled={selectable.length === 0}
              title={allSelected ? "Clear selection" : `Select all ${selectable.length} people`}
              aria-label="Select all users shown"
            />,
            "User",
            "Role & cost center grants",
            "",
          ]}
        >
          {paged.map(({ userEmail, grants }) => {
            const isMe = userEmail.toLowerCase() === currentUserEmail.toLowerCase();
            const isSelected = validSelected.has(userEmail);
            const emp = employeeMap.get(userEmail.toLowerCase());
            const rowBg = isSelected
              ? LIGHT_TONES.info.tint
              : isMe
                ? `${LIGHT_TONES.info.tint}80`
                : undefined;
            return (
              <tr
                key={userEmail}
                style={{ background: rowBg, borderBottom: `1px solid ${LIGHT_SURFACE.line}` }}
              >
                <td style={{ width: 32, padding: "8px 6px" }}>
                  <Checkbox
                    checked={isSelected}
                    disabled={isMe}
                    onChange={() => toggle(userEmail)}
                    title={isMe ? "You can't change your own role in bulk" : undefined}
                    aria-label={`Select ${userEmail}`}
                  />
                </td>
                <td style={{ padding: "8px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <UIAvatar
                      user={{ name: emp?.name ?? userEmail, email: userEmail }}
                      size="sm"
                    />
                    <div style={{ minWidth: 0 }}>
                      <p style={{
                        margin: 0,
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: 6,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: 14,
                        fontWeight: 500,
                        color: LIGHT_SURFACE.ink,
                      }}>
                        {emp?.name ?? userEmail}
                        {isMe && (
                          <UIChip tone="info" size="sm" variant="tint">You</UIChip>
                        )}
                      </p>
                      <p style={{
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: 12,
                        color: LIGHT_SURFACE.ink2,
                      }}>
                        {emp ? (emp.title || userEmail) : undefined}
                      </p>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "8px 12px", minWidth: 420 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <GrantsSummary
                        grants={grants}
                        allRoles={[...hrRoles, ...appOnlyRoles, ...customRoles]}
                      />
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <UIButton
                        variant={grants.length === 0 ? "primary" : "secondary"}
                        size="sm"
                        disabled={isMe}
                        onClick={() => setManagingEmail(userEmail)}
                      >
                        {grants.length === 0 ? "+ Add role" : "Manage"}
                      </UIButton>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "8px 12px", textAlign: "right" }}>
                  {!empLoading && !isMe && !allEmployeeEmails.has(userEmail.toLowerCase()) && (
                    <button
                      type="button"
                      title="Remove user"
                      onClick={() => setPurgingEmail(userEmail)}
                      aria-label={`Remove ${userEmail}`}
                      style={{
                        all: "unset",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 4,
                        borderRadius: 4,
                        color: LIGHT_SURFACE.ink2,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = LIGHT_TONES.danger.tint;
                        e.currentTarget.style.color = LIGHT_TONES.danger.fg;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = LIGHT_SURFACE.ink2;
                      }}
                    >
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
        </BasicTable>
      )}

      {assignments.length > 0 && filtered.length === 0 && (
        <p style={{ padding: "16px 0", textAlign: "center", fontSize: 12, color: LIGHT_SURFACE.ink2 }}>
          No one matches these filters.
        </p>
      )}

      {filtered.length > 0 && totalPages > 1 && (
        <div style={{
          marginTop: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 12,
          color: LIGHT_SURFACE.ink2,
        }}>
          <span>Showing {(pageSafe - 1) * PAGE_SIZE + 1}–{Math.min(pageSafe * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <UIButton size="sm" variant="secondary" onClick={() => setPage(pageSafe - 1)} disabled={pageSafe <= 1}>Prev</UIButton>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>Page {pageSafe} of {totalPages}</span>
            <UIButton size="sm" variant="secondary" onClick={() => setPage(pageSafe + 1)} disabled={pageSafe >= totalPages}>Next</UIButton>
          </div>
        </div>
      )}

      <UIModal
        open={confirming && validSelected.size > 0}
        onClose={closeConfirm}
        title="Clear all roles"
        footer={
          <Space>
            <UIButton variant="secondary" onClick={() => setConfirming(false)} disabled={bulkPending}>Cancel</UIButton>
            <UIButton variant="primary" onClick={applyBulkClear} disabled={bulkPending} loading={bulkPending}>
              {bulkPending ? "Clearing…" : `Clear ${validSelected.size} ${validSelected.size === 1 ? "person" : "people"}`}
            </UIButton>
          </Space>
        }
      >
        <p style={{ margin: 0, fontSize: 14, color: LIGHT_SURFACE.ink }}>
          Remove every role grant from <span style={{ fontWeight: 600 }}>{validSelected.size}</span>{" "}
          {validSelected.size === 1 ? "person" : "people"}? They will no longer have access to this app.
        </p>
        <ul style={{
          marginTop: 12,
          padding: 0,
          listStyle: "none",
          maxHeight: 224,
          overflowY: "auto",
          borderRadius: 6,
          border: `1px solid ${LIGHT_SURFACE.line}`,
          fontSize: 14,
        }}>
          {[...validSelected].map((email) => {
            const emp = employeeMap.get(email.toLowerCase());
            return (
              <li key={email} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "6px 12px",
                borderBottom: `1px solid ${LIGHT_SURFACE.line}`,
                color: LIGHT_SURFACE.ink,
              }}>
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {emp?.name ?? email}
                </span>
              </li>
            );
          })}
        </ul>
      </UIModal>

      <UIModal
        open={purgingEmail !== null}
        onClose={() => { if (!replaceGrants.isPending) setPurgingEmail(null); }}
        title="Remove user"
        footer={
          <Space>
            <UIButton variant="secondary" onClick={() => setPurgingEmail(null)} disabled={replaceGrants.isPending}>Cancel</UIButton>
            <UIButton
              variant="danger"
              onClick={() => {
                if (!purgingEmail) return;
                replaceGrants.mutate(
                  { email: purgingEmail, grants: [] },
                  {
                    onSuccess: () => {
                      setNotice(`Removed ${purgingEmail}.`);
                      setPurgingEmail(null);
                    },
                    onError: () => setNotice("Failed to remove user — please try again."),
                  }
                );
              }}
              disabled={replaceGrants.isPending}
              loading={replaceGrants.isPending}
            >
              {replaceGrants.isPending ? "Removing…" : "Remove"}
            </UIButton>
          </Space>
        }
      >
        <p style={{ margin: 0, fontSize: 14, color: LIGHT_SURFACE.ink }}>
          Clear every role grant for{" "}
          <span style={{ fontWeight: 600 }}>{purgingEmail}</span>? This user is
          no longer in the employee roster, so their grants cannot be managed
          through the normal flow.
        </p>
      </UIModal>

      <ManageGrantsModal
        // Keyed by target email so switching users or reopening after close
        // remounts the modal subtree and resets the add-grant form state.
        key={managingEmail ?? "closed"}
        open={managingEmail !== null}
        onClose={() => setManagingEmail(null)}
        userEmail={managingEmail ?? ""}
        userLabel={
          managingEmail
            ? employeeMap.get(managingEmail.toLowerCase())?.name ?? managingEmail
            : ""
        }
        grants={
          managingEmail
            ? orderedUsers.find(
                (u) => u.userEmail.toLowerCase() === managingEmail.toLowerCase()
              )?.grants ?? []
            : []
        }
        allRoles={[...hrRoles, ...appOnlyRoles, ...customRoles]}
        departmentOptions={departmentOptions}
        costCentersByDept={costCentersByDept}
        pending={replaceGrants.isPending}
        onReplace={async (next) => {
          if (!managingEmail) return;
          try {
            await replaceGrants.mutateAsync({ email: managingEmail, grants: next });
          } catch (err) {
            setNotice("Failed to update grants — please try again.");
            throw err;
          }
        }}
      />
    </div>
  );
}

// ── GrantsSummary ─────────────────────────────────────────────────────────────
// Compact row-cell view. Groups N grants into a short line + role chips, so a
// user with 20 (role, dept, CC) rows doesn't balloon the table. The full list
// + editing lives in ManageGrantsModal.

function GrantsSummary({
  grants,
  allRoles,
}: {
  grants: UserAppRoleGrantRow[];
  allRoles: { code: string; label: string }[];
}) {
  const roleLabel = (code: string) =>
    allRoles.find((r) => r.code === code)?.label ?? code;

  if (grants.length === 0) {
    return <span style={{ fontSize: 12, color: LIGHT_SURFACE.ink2 }}>No access</span>;
  }

  // Count distinct roles and distinct dept/CC targets to summarise the scope.
  const roleCounts = new Map<string, number>();
  const deptSet = new Set<string>();
  for (const g of grants) {
    roleCounts.set(g.roleCode, (roleCounts.get(g.roleCode) ?? 0) + 1);
    deptSet.add(g.departmentCode ?? "");
  }
  const topRoles = [...roleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const overflow = roleCounts.size - topRoles.length;

  return (
    <div style={{ display: "flex", minWidth: 0, flexDirection: "column", gap: 4 }}>
      <Space size={6} wrap>
        {topRoles.map(([code, count]) => (
          <UIChip key={code} tone="accent" size="sm" variant="tint">
            {roleLabel(code)}
            {count > 1 ? ` · ${count}` : ""}
          </UIChip>
        ))}
        {overflow > 0 && (
          <UIChip tone="neutral" size="sm" variant="dot">
            +{overflow} role{overflow === 1 ? "" : "s"}
          </UIChip>
        )}
      </Space>
      <span style={{ fontSize: 11, color: LIGHT_SURFACE.ink2 }}>
        {grants.length} grant{grants.length === 1 ? "" : "s"} · {deptSet.size} dept
        {deptSet.size === 1 ? "" : "s"}
      </span>
    </div>
  );
}

// ── ManageGrantsModal ─────────────────────────────────────────────────────────
// Modal interface for viewing, adding, and removing a single user's grants.
// Uses orca-ui Modal / Select / Button / Chip so the look matches the rest of
// the app and scales to many grants via an internal scrollable list.

function ManageGrantsModal({
  open,
  onClose,
  userLabel,
  grants,
  allRoles,
  departmentOptions,
  costCentersByDept,
  pending,
  onReplace,
}: {
  open: boolean;
  onClose: () => void;
  userEmail: string;
  userLabel: string;
  grants: UserAppRoleGrantRow[];
  allRoles: { code: string; label: string }[];
  departmentOptions: string[];
  costCentersByDept: Map<string, string[]>;
  pending: boolean;
  onReplace: (next: UserAppRoleGrant[]) => Promise<void>;
}) {
  const [newRole, setNewRole] = useState("");
  const [newDept, setNewDept] = useState("");
  const [newCostCenters, setNewCostCenters] = useState<Set<string>>(() => new Set());
  const roleLabel = (code: string) =>
    allRoles.find((r) => r.code === code)?.label ?? code;

  // Form state resets because the parent keys this component by the target
  // email (`key={managingEmail}`), so React remounts the whole modal on
  // open/close and on target change — no useEffect needed.

  const toGrants = (list: UserAppRoleGrantRow[]): UserAppRoleGrant[] =>
    list.map((g) => ({
      roleCode: g.roleCode,
      departmentCode: g.departmentCode ?? WILDCARD_SCOPE,
      costCenterCode: g.costCenterCode ?? WILDCARD_SCOPE,
    }));

  const availableCCs = costCentersByDept.get(newDept) ?? [];

  const toggleCC = (cc: string) =>
    setNewCostCenters((prev) => {
      const next = new Set(prev);
      if (next.has(cc)) next.delete(cc);
      else next.add(cc);
      return next;
    });

  const removeGrant = (role: string, dept: string, cc: string): Promise<void> => {
    const next = grants
      .filter(
        (g) =>
          !(
            g.roleCode === role &&
            (g.departmentCode ?? "") === dept &&
            (g.costCenterCode ?? "") === cc
          )
      );
    return onReplace(toGrants(next));
  };

  const addGrant = async () => {
    if (!newRole || !newDept) return;
    // Admin must pick at least one cost center. Nothing picked = no role.
    if (newCostCenters.size === 0) return;
    const existing = toGrants(grants);
    const chosenCCs = [...newCostCenters];
    const additions: UserAppRoleGrant[] = chosenCCs.map((cc) => ({
      roleCode: newRole,
      departmentCode: newDept,
      costCenterCode: cc,
    }));
    const dedupeKey = (g: UserAppRoleGrant) =>
      `${g.roleCode}|${g.departmentCode}|${g.costCenterCode}`;
    const seen = new Set(existing.map(dedupeKey));
    const next = [...existing];
    for (const a of additions) {
      if (!seen.has(dedupeKey(a))) {
        next.push(a);
        seen.add(dedupeKey(a));
      }
    }
    try {
      await onReplace(next);
      // Only reset the form once the save actually succeeded, so a backend
      // failure leaves the admin's picks intact for retry.
      setNewRole("");
      setNewDept("");
      setNewCostCenters(new Set());
    } catch {
      // Parent surfaces the error; leave form state alone so the admin can retry.
    }
  };


  // Group grants by (role, dept) so the current-grants list is scannable. Each
  // group shows its CCs as sub-rows with individual × controls.
  interface GrantGroup {
    key: string;
    roleCode: string;
    departmentCode: string;
    costCenters: string[];
  }
  const groups: GrantGroup[] = useMemo(() => {
    const m = new Map<string, GrantGroup>();
    for (const g of grants) {
      const dept = g.departmentCode ?? "";
      const key = `${g.roleCode}|${dept}`;
      const existing = m.get(key);
      if (existing) {
        existing.costCenters.push(g.costCenterCode ?? "");
      } else {
        m.set(key, {
          key,
          roleCode: g.roleCode,
          departmentCode: dept,
          costCenters: [g.costCenterCode ?? ""],
        });
      }
    }
    for (const group of m.values()) {
      group.costCenters.sort((a, b) => a.localeCompare(b));
    }
    return [...m.values()].sort((a, b) =>
      a.roleCode === b.roleCode
        ? a.departmentCode.localeCompare(b.departmentCode)
        : a.roleCode.localeCompare(b.roleCode)
    );
  }, [grants]);

  const sectionHeading: CSSProperties = {
    margin: "0 0 8px",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: LIGHT_SURFACE.ink2,
  };

  return (
    <UIModal
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <span>
          Manage roles ·{" "}
          <span style={{ fontWeight: 400, color: LIGHT_SURFACE.ink2 }}>{userLabel}</span>
        </span>
      }
      footer={
        <UIButton variant="secondary" onClick={onClose}>
          Done
        </UIButton>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Current grants */}
        <section>
          <h4 style={sectionHeading}>Current roles ({grants.length})</h4>
          {grants.length === 0 ? (
            <div style={{
              borderRadius: 6,
              border: `1px dashed ${LIGHT_SURFACE.line}`,
              background: LIGHT_SURFACE.canvas,
              padding: "24px 16px",
              textAlign: "center",
              fontSize: 14,
              color: LIGHT_SURFACE.ink2,
            }}>
              No roles assigned yet.
            </div>
          ) : (
            <div style={{
              maxHeight: 288,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              borderRadius: 6,
              border: `1px solid ${LIGHT_SURFACE.line}`,
              padding: 8,
            }}>
              {groups.map((group) => (
                <div key={group.key} style={{
                  borderRadius: 6,
                  background: LIGHT_SURFACE.canvas,
                  padding: "8px 12px",
                }}>
                  <div style={{
                    marginBottom: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 14,
                      fontWeight: 500,
                      color: LIGHT_SURFACE.ink,
                    }}>
                      <UIChip tone="accent" size="sm" variant="tint">
                        {roleLabel(group.roleCode)}
                      </UIChip>
                      <span style={{ color: LIGHT_SURFACE.ink2 }}>·</span>
                      <span>{group.departmentCode || "(no dept)"}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {group.costCenters.map((cc) => (
                      <UIChip
                        key={cc}
                        tone="neutral"
                        size="sm"
                        variant="dot"
                        onDelete={
                          pending
                            ? undefined
                            : () => removeGrant(group.roleCode, group.departmentCode, cc)
                        }
                      >
                        {cc || "all cost centers"}
                      </UIChip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Add new grant */}
        <section>
          <h4 style={sectionHeading}>Add a role</h4>
          <div style={{
            borderRadius: 6,
            border: `1px solid ${LIGHT_SURFACE.line}`,
            background: LIGHT_SURFACE.surface,
            padding: 12,
          }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}>
              <UISelect
                label="Role"
                value={newRole}
                onChange={(v) => setNewRole(v)}
                placeholder="Choose a role…"
                options={allRoles.map((r) => ({ value: r.code, label: r.label }))}
              />
              <UISelect
                label="Department"
                value={newDept}
                onChange={(v) => {
                  setNewDept(v);
                  setNewCostCenters(new Set());
                }}
                placeholder="Choose a department…"
                options={departmentOptions.map((d) => ({ value: d, label: d }))}
              />
            </div>

            {newDept && (
              <div style={{ marginTop: 12 }}>
                <label style={{
                  display: "block",
                  marginBottom: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: LIGHT_SURFACE.ink,
                }}>
                  Cost centers in {newDept}
                </label>
                {availableCCs.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 12, color: LIGHT_SURFACE.ink2 }}>
                    No cost centers mapped to this department.
                  </p>
                ) : (
                  <div style={{
                    maxHeight: 192,
                    overflowY: "auto",
                    borderRadius: 4,
                    border: `1px solid ${LIGHT_SURFACE.line}`,
                    background: LIGHT_SURFACE.canvas,
                  }}>
                    {/* "All" is a shortcut — checking it fills the selection
                        with every CC in this dept; unchecking clears. The
                        individual checkboxes stay enabled and honestly reflect
                        what will be saved. */}
                    <div style={{
                      padding: 8,
                      borderBottom: `1px solid ${LIGHT_SURFACE.line}`,
                      background: LIGHT_SURFACE.surface,
                    }}>
                      <Checkbox
                        indeterminate={
                          newCostCenters.size > 0 &&
                          newCostCenters.size < availableCCs.length
                        }
                        checked={
                          newCostCenters.size === availableCCs.length &&
                          availableCCs.length > 0
                        }
                        onChange={(e) => {
                          setNewCostCenters(
                            e.target.checked ? new Set(availableCCs) : new Set()
                          );
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 600 }}>
                          All cost centers in {newDept}
                        </span>
                        <span style={{ marginLeft: 6, fontSize: 11, color: LIGHT_SURFACE.ink2 }}>
                          ({availableCCs.length})
                        </span>
                      </Checkbox>
                    </div>
                    <div style={{ padding: 8 }}>
                      <Checkbox.Group
                        value={[...newCostCenters]}
                        style={{ display: "flex", flexDirection: "column", gap: 4 }}
                      >
                        {availableCCs.map((cc) => (
                          <Checkbox
                            key={cc}
                            value={cc}
                            checked={newCostCenters.has(cc)}
                            onChange={() => toggleCC(cc)}
                          >
                            <span style={{ fontSize: 12 }}>{cc}</span>
                          </Checkbox>
                        ))}
                      </Checkbox.Group>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <UIButton
                variant="primary"
                onClick={addGrant}
                disabled={!newRole || !newDept || newCostCenters.size === 0}
                loading={pending}
              >
                {newCostCenters.size === availableCCs.length && availableCCs.length > 0
                  ? `Add role (all ${availableCCs.length} cost centers)`
                  : newCostCenters.size > 1
                    ? `Add role (${newCostCenters.size} cost centers)`
                    : "Add role"}
              </UIButton>
            </div>
          </div>
        </section>
      </div>
    </UIModal>
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
  assignments: UserAppRoleGrantRow[];
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
  const [confirmDeleteRole, setConfirmDeleteRole] = useState<string | undefined>();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | undefined>();
  const [localOverrides, setLocalOverrides] = useState<Record<string, Set<string>>>({});
  const [addingRole, setAddingRole] = useState(false);
  const [newRoleLabel, setNewRoleLabel] = useState("");

  const appRoleCodes = useMemo(() => new Set(roles.map((r) => r.code)), [roles]);
  const customRoleCodes = useMemo(() => new Set(customRoles.map((r) => r.code)), [customRoles]);
  const hrRolesForMatrix = useMemo(() => hrRoles.filter((r) => !appRoleCodes.has(r.code)), [hrRoles, appRoleCodes]);
  const staticGrantingRoles = roles.filter((r) => r.code !== "NONE");
  const grantingRoles = [...hrRolesForMatrix, ...staticGrantingRoles, ...customRoles];
  const isMutating = grant.isPending || revoke.isPending || reset.isPending || createCustomRole.isPending || deleteCustomRole.isPending || saving;
  const isCustomized = dbPairs.length > 0;
  const newRoleCode = newRoleLabel
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    // Strip anything that isn't an identifier character so the resulting
    // code can safely be used as a URL path segment and matches the
    // server-side identifier shape.
    .replace(/[^A-Z0-9_]/g, "");
  const newRoleCodeValid = CUSTOM_ROLE_CODE_RE.test(newRoleCode);

  function handleCreateRole() {
    if (!newRoleCodeValid) return;
    createCustomRole.mutate({ code: newRoleCode, label: newRoleLabel.trim() }, {
      onSuccess: () => { setNewRoleLabel(""); setAddingRole(false); },
    });
  }

  function effectiveRoles(cap: AppCapability): Set<string> {
    const dbForCap = dbPairs.filter((p) => p.capabilityCode === cap.code);
    return new Set(dbForCap.length > 0 ? dbForCap.map((p) => p.roleCode) : (cap.defaultRoles ?? []));
  }

  function effectiveRolesWithOverrides(cap: AppCapability): Set<string> {
    return localOverrides[cap.code] ?? effectiveRoles(cap);
  }

  function handleToggle(cap: AppCapability, roleCode: string) {
    const current = effectiveRolesWithOverrides(cap);
    const next = new Set(current);
    if (next.has(roleCode)) next.delete(roleCode);
    else next.add(roleCode);
    setLocalOverrides(prev => ({ ...prev, [cap.code]: next }));
  }

  function handleDone() {
    setSaveError(undefined);
    const overrideEntries = Object.entries(localOverrides);
    if (overrideEntries.length === 0) { setEditing(false); return; }
    const grants: { capabilityCode: string; roleCode: string }[] = [];
    const revokes: { capabilityCode: string; roleCode: string }[] = [];
    for (const [capCode, desiredRoles] of overrideEntries) {
      const cap = capabilities.find(c => c.code === capCode);
      if (!cap) continue;
      const currentRoles = effectiveRoles(cap);
      for (const role of desiredRoles) {
        if (!currentRoles.has(role)) grants.push({ capabilityCode: capCode, roleCode: role });
      }
      for (const role of currentRoles) {
        if (!desiredRoles.has(role)) revokes.push({ capabilityCode: capCode, roleCode: role });
      }
    }
    if (grants.length === 0 && revokes.length === 0) { setLocalOverrides({}); setEditing(false); return; }
    setSaving(true);
    Promise.allSettled([
      ...grants.map(g => grant.mutateAsync(g)),
      ...revokes.map(r => revoke.mutateAsync(r)),
    ]).then((results) => {
      setSaving(false);
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        // Leave edit mode and localOverrides intact so the admin can retry.
        setSaveError(
          `${failed} of ${results.length} capability change${results.length === 1 ? "" : "s"} failed. Please try again.`
        );
        return;
      }
      setLocalOverrides({});
      setEditing(false);
    });
  }

  const closeConfirmReset = useCallback(() => { if (!reset.isPending) setConfirmReset(false); }, [reset.isPending]);
  const closeConfirmDeleteRole = useCallback(() => { if (!deleteCustomRole.isPending) setConfirmDeleteRole(undefined); }, [deleteCustomRole.isPending]);

  return (
    <div>
      <PaneHeader
        title="Access Matrix"
        hint={editing ? "Configure which roles have each capability. Changes are saved per workspace." : "Read-only view. Click Edit to make changes."}
        action={
          editing ? (
            <Space size={8}>
              {isCustomized && (
                <UIButton variant="secondary" size="sm" onClick={() => setConfirmReset(true)} disabled={isMutating}>Reset to defaults</UIButton>
              )}
              <UIButton variant="secondary" size="sm" onClick={() => setAddingRole(true)} disabled={addingRole || isMutating}>+ Add role</UIButton>
              <UIButton variant="primary" size="sm" onClick={handleDone} disabled={isMutating} loading={saving}>{saving ? "Saving…" : "Done"}</UIButton>
            </Space>
          ) : (
            <Space size={8}>
              <UIButton variant="secondary" size="sm" onClick={() => setAddingRole(true)} disabled={addingRole}>+ Add role</UIButton>
              <UIButton variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit</UIButton>
            </Space>
          )
        }
      />

      {saveError && (
        <div style={{
          marginBottom: 12,
          borderRadius: 10,
          background: LIGHT_TONES.danger.tint,
          color: LIGHT_TONES.danger.fg,
          padding: "8px 12px",
          fontSize: 14,
          boxShadow: `inset 0 0 0 1px ${LIGHT_TONES.danger.dot}33`,
        }}>
          {saveError}
        </div>
      )}

      {isLoading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0" }}>
          <span
            aria-label="Loading"
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              border: `2px solid ${LIGHT_SURFACE.line}`,
              borderTopColor: LIGHT_SURFACE.brand,
              animation: "spin 0.8s linear infinite",
              display: "inline-block",
            }}
          />
        </div>
      ) : (
        <BasicTable headers={[
          "Capability",
          ...grantingRoles.map((role) => {
            // Dedupe by email so a user holding this role across multiple
            // cost centers counts once (assignments is grant-row granularity).
            const count = new Set(
              assignments
                .filter((a) => a.roleCode === role.code)
                .map((a) => a.userEmail.toLowerCase())
            ).size;
            const isCustom = customRoleCodes.has(role.code);
            return (
              <span key={role.code} style={{ margin: "0 auto", display: "block", width: 92, textAlign: "center" }}>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <span>{role.label}</span>
                  {isCustom && (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteRole(role.code)}
                      disabled={deleteCustomRole.isPending}
                      aria-label={`Delete role ${role.label}`}
                      title="Delete this role"
                      style={{
                        all: "unset",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        fontSize: 10,
                        color: LIGHT_SURFACE.ink2,
                        cursor: deleteCustomRole.isPending ? "not-allowed" : "pointer",
                        opacity: deleteCustomRole.isPending ? 0.4 : 1,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = LIGHT_TONES.danger.tint;
                        e.currentTarget.style.color = LIGHT_TONES.danger.fg;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = LIGHT_SURFACE.ink2;
                      }}
                    >×</button>
                  )}
                </span>
                <span style={{ marginTop: 2, display: "block", fontWeight: 400, color: LIGHT_SURFACE.ink2 }}>
                  {count} {count === 1 ? "person" : "people"}
                </span>
              </span>
            );
          }),
          addingRole ? (
            <div key="__add" style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Input
                autoFocus
                size="small"
                value={newRoleLabel}
                onChange={(e) => setNewRoleLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateRole();
                  if (e.key === "Escape") { setAddingRole(false); setNewRoleLabel(""); }
                }}
                placeholder="Role name…"
                aria-label="New role name"
                style={{ width: 96 }}
              />
              <button
                type="button"
                onClick={handleCreateRole}
                disabled={!newRoleCodeValid || createCustomRole.isPending}
                aria-label="Confirm new role"
                style={{
                  all: "unset",
                  cursor: "pointer",
                  color: LIGHT_SURFACE.brand,
                  opacity: !newRoleCodeValid || createCustomRole.isPending ? 0.4 : 1,
                }}
              >✓</button>
              <button
                type="button"
                onClick={() => { setAddingRole(false); setNewRoleLabel(""); }}
                aria-label="Cancel"
                style={{ all: "unset", cursor: "pointer", color: LIGHT_SURFACE.ink2 }}
              >✕</button>
            </div>
          ) : (
            <button
              key="__add"
              type="button"
              onClick={() => setAddingRole(true)}
              aria-label="Add custom role"
              title="Add custom role"
              style={{
                all: "unset",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                borderRadius: "50%",
                border: `1px dashed ${LIGHT_SURFACE.line}`,
                fontSize: 14,
                fontWeight: 700,
                color: LIGHT_SURFACE.ink2,
                cursor: "pointer",
              }}
            >+</button>
          ),
        ]}>
          {capabilities.map((cap) => {
            const effective = effectiveRolesWithOverrides(cap);
            return (
              <tr key={cap.code} style={{ borderBottom: `1px solid ${LIGHT_SURFACE.line}` }}>
                <td style={{ padding: "8px 12px", color: LIGHT_SURFACE.ink }}>{cap.label}</td>
                {grantingRoles.map((role) => {
                  const isOn = effective.has(role.code);
                  return (
                    <td key={role.code} style={{ padding: "8px 6px", textAlign: "center" }}>
                      {editing ? (
                        <Checkbox
                          checked={isOn}
                          onChange={() => handleToggle(cap, role.code)}
                          disabled={isMutating}
                          aria-label={`${role.label} has ${cap.label}`}
                        />
                      ) : isOn ? (
                        <svg
                          viewBox="0 0 16 16"
                          width={16}
                          height={16}
                          fill={LIGHT_TONES.success.dot}
                          style={{ display: "inline-block" }}
                          aria-label={`${role.label} has ${cap.label}`}
                        >
                          <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                        </svg>
                      ) : undefined}
                    </td>
                  );
                })}
                <td style={{ padding: "8px 6px" }} />
              </tr>
            );
          })}
        </BasicTable>
      )}

      <UIModal
        open={confirmReset}
        onClose={closeConfirmReset}
        title="Reset access matrix"
        footer={
          <Space>
            <UIButton variant="secondary" onClick={() => setConfirmReset(false)} disabled={reset.isPending}>Cancel</UIButton>
            <UIButton
              variant="primary"
              onClick={() => reset.mutate(undefined, { onSuccess: () => { setConfirmReset(false); setLocalOverrides({}); } })}
              disabled={reset.isPending}
              loading={reset.isPending}
            >
              {reset.isPending ? "Resetting…" : "Reset to defaults"}
            </UIButton>
          </Space>
        }
      >
        <p style={{ margin: 0, fontSize: 14, color: LIGHT_SURFACE.ink }}>
          All capability-role configuration for this app will be cleared. The access matrix will revert to the app&apos;s built-in defaults. This cannot be undone.
        </p>
      </UIModal>

      {(() => {
        const roleToDelete = confirmDeleteRole ? grantingRoles.find((r) => r.code === confirmDeleteRole) : undefined;
        // Dedupe by email: assignments is grant rows, not users, so a user
        // holding this role in multiple cost centers must count once.
        const usersWithRole = confirmDeleteRole
          ? new Set(
              assignments
                .filter((a) => a.roleCode === confirmDeleteRole)
                .map((a) => a.userEmail.toLowerCase())
            ).size
          : 0;
        return (
          <UIModal
            open={!!confirmDeleteRole}
            onClose={closeConfirmDeleteRole}
            title="Delete custom role"
            footer={
              <Space>
                <UIButton variant="secondary" onClick={() => setConfirmDeleteRole(undefined)} disabled={deleteCustomRole.isPending}>Cancel</UIButton>
                <UIButton
                  variant="danger"
                  onClick={() => confirmDeleteRole && deleteCustomRole.mutate(confirmDeleteRole, { onSuccess: () => setConfirmDeleteRole(undefined) })}
                  disabled={deleteCustomRole.isPending}
                  loading={deleteCustomRole.isPending}
                >
                  {deleteCustomRole.isPending ? "Deleting…" : "Delete role"}
                </UIButton>
              </Space>
            }
          >
            <p style={{ margin: 0, fontSize: 14, color: LIGHT_SURFACE.ink }}>
              Delete <span style={{ fontWeight: 600 }}>{roleToDelete?.label ?? confirmDeleteRole}</span>?
              This removes it from the access matrix.
            </p>
            {usersWithRole > 0 && (
              <p style={{ marginTop: 8, marginBottom: 0, fontSize: 12, color: LIGHT_TONES.warning.fg }}>
                {usersWithRole} {usersWithRole === 1 ? "person currently holds" : "people currently hold"} this role.
                Their role code will be left as-is until reassigned.
              </p>
            )}
          </UIModal>
        );
      })()}
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

  const historyError = userRolesQuery.isError || customRolesQuery.isError;

  return (
    <div>
      <PaneHeader
        title="Change History"
        hint="Newest first. Entries cannot be edited or removed."
        action={
          <div style={{
            display: "flex",
            overflow: "hidden",
            borderRadius: 6,
            border: `1px solid ${LIGHT_SURFACE.line}`,
          }}>
            {([ ["all", "All changes"], ["roles", "Role assignments only"] ] as const).map(([id, label]) => {
              const on = only === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setOnly(id)}
                  style={{
                    all: "unset",
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    background: on ? LIGHT_SURFACE.brand : LIGHT_SURFACE.surface,
                    color: on ? "#FFFFFF" : LIGHT_SURFACE.ink2,
                    transition: "background 120ms, color 120ms",
                  }}
                >{label}</button>
              );
            })}
          </div>
        }
      />
      {historyError && (
        <div style={{
          marginBottom: 12,
          borderRadius: 10,
          background: LIGHT_TONES.danger.tint,
          color: LIGHT_TONES.danger.fg,
          padding: "8px 12px",
          fontSize: 14,
          boxShadow: `inset 0 0 0 1px ${LIGHT_TONES.danger.dot}33`,
        }}>
          Failed to load history — check your connection and try refreshing.
        </div>
      )}
      {entries.length === 0 && !historyError && (
        <EmptyState
          icon={null}
          title="No changes recorded yet"
          description="Role changes made in this app appear here."
        />
      )}
      {entries.length > 0 && (
        <BasicTable headers={["When", "Who", "Action", "Detail"]}>
          {entries.slice(0, 100).map((entry) => (
            <tr key={entry.auditId} style={{ borderBottom: `1px solid ${LIGHT_SURFACE.line}` }}>
              <td style={{ whiteSpace: "nowrap", padding: "8px 12px", fontSize: 12, color: LIGHT_SURFACE.ink2 }}>
                {formatDateTime(entry.createdAt)}
              </td>
              <td style={{ padding: "8px 12px", color: LIGHT_SURFACE.ink }}>{entry.userEmail}</td>
              <td style={{ padding: "8px 12px" }}>
                <UIChip tone="info" size="sm" variant="tint">{entry.action}</UIChip>
              </td>
              <td style={{ padding: "8px 12px", color: LIGHT_SURFACE.ink2 }}>{describeAuditEntry(entry)}</td>
            </tr>
          ))}
        </BasicTable>
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
  OVER_PRIVILEGED: "danger",
  UNDER_PRIVILEGED: "warning",
  UNUSUAL_FOR_TITLE: "info",
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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <h4 style={{
        margin: 0,
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 14,
        fontWeight: 600,
        color: LIGHT_SURFACE.ink,
      }}>
        <span style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: LIGHT_SURFACE.ink,
          fontSize: 11,
          fontWeight: 600,
          color: LIGHT_SURFACE.surface,
        }}>{n}</span>
        {title}
      </h4>
      {aside && <span style={{ fontSize: 12, color: LIGHT_SURFACE.ink2 }}>{aside}</span>}
    </div>
  );
}

function exportAuditToCsv(result: RoleAuditResult): void {
  // Guard against CSV formula injection: Excel/Sheets will execute any cell
  // starting with =, +, -, @, tab, or CR as a formula. Prefix any such cell
  // with a single quote inside the quoted value so the spreadsheet treats
  // it as plain text.
  const cell = (s: string) => {
    const escaped = s.replace(/"/g, '""');
    const first = escaped.charAt(0);
    const needsPrefix = first === "=" || first === "+" || first === "-" || first === "@" || first === "\t" || first === "\r";
    return `"${needsPrefix ? "'" : ""}${escaped}"`;
  };
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
  onRun: (criteria: AuditCriteria) => Promise<RoleAuditResult | undefined>;
  isPending: boolean;
  error: string | undefined;
  isLoadingEmployees: boolean;
  auditSubjectCount: number | undefined;
}) {
  const { currentUserEmail } = useCtx();
  // Audit "Apply suggestion" routes through the multi-grant replace path so
  // every write in this component goes through the same contract. The
  // audit finding has no department/cost-center scope, so we send a single
  // wildcard grant (empty dept + CC) — this preserves the pre-multi-grant
  // behavior of replacing the user's access with the suggested role.
  const replaceGrants = useReplaceUserGrants();
  const [applyError, setApplyError] = useState<string | undefined>();
  const [criteria, setCriteria] = useState<AuditCriteria>(DEFAULT_AUDIT_CRITERIA);
  const [applyConfirm, setApplyConfirm] = useState<RoleAuditFinding | undefined>();
  const [ignoredKeys, setIgnoredKeys] = useState<Set<string>>(() => new Set());

  const runDisabled = isPending || isLoadingEmployees || subjects.length === 0;
  const pendingApply = replaceGrants.isPending;
  const closeApplyConfirm = useCallback(() => {
    if (!pendingApply) {
      setApplyConfirm(undefined);
      setApplyError(undefined);
    }
  }, [pendingApply]);

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
      <div style={{ margin: "0 auto", maxWidth: 768, padding: "8px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span style={{
            display: "flex",
            width: 40,
            height: 40,
            flexShrink: 0,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 10,
            background: LIGHT_TONES.info.tint,
            color: LIGHT_SURFACE.brand,
            boxShadow: `inset 0 0 0 1px ${LIGHT_TONES.info.dot}33`,
          }}>
            <SparkleIcon size={20} />
          </span>
          <div>
            <h3 style={{
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 16,
              fontWeight: 600,
              color: LIGHT_SURFACE.ink,
            }}>
              Audit roles with AI
              <UIChip tone="info" size="sm" variant="tint">AI</UIChip>
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: 14, color: LIGHT_SURFACE.ink2 }}>
              Reviews the roles of the{" "}
              <span style={{ fontWeight: 500, color: LIGHT_SURFACE.ink }}>{subjects.length} people</span> on the Users list and flags likely mismatches. Choose what to check, then run.
            </p>
          </div>
        </div>

        <div style={{
          marginTop: 20,
          overflow: "hidden",
          borderRadius: 10,
          border: `1px solid ${LIGHT_SURFACE.line}`,
          background: LIGHT_SURFACE.surface,
        }}>
          <section style={{ padding: 20 }}>
            <StepHeading n={1} title="What should it check?" aside={`${selectedCount} of ${AUDIT_CRITERIA_OPTIONS.length} selected`} />
            <div style={{
              marginTop: 12,
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            }}>
              {AUDIT_CRITERIA_OPTIONS.map((opt) => {
                const on = criteria[opt.key];
                return (
                  <button
                    key={opt.key}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    disabled={isPending}
                    onClick={() => setCriteria((c) => ({ ...c, [opt.key]: !c[opt.key] }))}
                    onKeyDown={(e) => { if (e.key === " ") { e.preventDefault(); setCriteria((c) => ({ ...c, [opt.key]: !c[opt.key] })); } }}
                    style={{
                      all: "unset",
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      borderRadius: 10,
                      border: `1px solid ${on ? LIGHT_TONES.info.dot : LIGHT_SURFACE.line}`,
                      background: on ? `${LIGHT_TONES.info.tint}99` : LIGHT_SURFACE.surface,
                      padding: 14,
                      textAlign: "left",
                      cursor: isPending ? "not-allowed" : "pointer",
                      opacity: isPending ? 0.6 : 1,
                      boxShadow: on ? `inset 0 0 0 1px ${LIGHT_TONES.info.dot}55` : undefined,
                      transition: "background 120ms, border-color 120ms",
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        right: 12,
                        top: 12,
                        display: "flex",
                        width: 16,
                        height: 16,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 4,
                        border: `1px solid ${on ? LIGHT_SURFACE.brand : LIGHT_SURFACE.line}`,
                        background: on ? LIGHT_SURFACE.brand : LIGHT_SURFACE.surface,
                        fontSize: 10,
                        fontWeight: 700,
                        color: on ? "#FFFFFF" : "transparent",
                      }}
                    >✓</span>
                    <span style={{
                      display: "flex",
                      width: 32,
                      height: 32,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 6,
                      background: on ? LIGHT_SURFACE.surface : LIGHT_SURFACE.canvas,
                      color: on ? LIGHT_SURFACE.brand : LIGHT_SURFACE.ink2,
                    }}>
                      <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d={opt.icon} />
                      </svg>
                    </span>
                    <span style={{ marginTop: 10, fontSize: 14, fontWeight: 600, color: LIGHT_SURFACE.ink }}>{opt.title}</span>
                    <span style={{ marginTop: 2, fontSize: 12, lineHeight: 1.5, color: LIGHT_SURFACE.ink2 }}>{opt.description}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section style={{ borderTop: `1px solid ${LIGHT_SURFACE.line}`, padding: 20 }}>
            <StepHeading n={2} title="Anything else to consider?" aside="Optional" />
            <Input.TextArea
              value={instructions}
              onChange={(e) => setCriteria((c) => ({ ...c, customInstructions: e.target.value.slice(0, INSTRUCTIONS_MAX) }))}
              disabled={isPending}
              placeholder='Describe your own rules in plain language, e.g. "Only HR accounts should have admin access."'
              rows={3}
              aria-label="Additional instructions for the audit"
              style={{ marginTop: 12 }}
            />
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: LIGHT_SURFACE.ink2 }}>Try:</span>
              {INSTRUCTION_EXAMPLES.map((text) => (
                <button
                  key={text}
                  type="button"
                  disabled={isPending}
                  onClick={() => appendExample(text)}
                  style={{
                    all: "unset",
                    borderRadius: 999,
                    border: `1px solid ${LIGHT_SURFACE.line}`,
                    background: LIGHT_SURFACE.surface,
                    padding: "4px 10px",
                    fontSize: 12,
                    color: LIGHT_SURFACE.ink2,
                    cursor: isPending ? "not-allowed" : "pointer",
                    opacity: isPending ? 0.5 : 1,
                    transition: "color 120ms, border-color 120ms",
                  }}
                  onMouseEnter={(e) => {
                    if (isPending) return;
                    e.currentTarget.style.borderColor = LIGHT_TONES.info.dot;
                    e.currentTarget.style.color = LIGHT_SURFACE.brand;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = LIGHT_SURFACE.line;
                    e.currentTarget.style.color = LIGHT_SURFACE.ink2;
                  }}
                >
                  + {text}
                </button>
              ))}
              <span style={{ marginLeft: "auto", fontSize: 12, fontVariantNumeric: "tabular-nums", color: LIGHT_SURFACE.ink2 }}>
                {instructions.length}/{INSTRUCTIONS_MAX}
              </span>
            </div>
          </section>

          <footer style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            borderTop: `1px solid ${LIGHT_SURFACE.line}`,
            background: LIGHT_SURFACE.canvas,
            padding: "16px 20px",
          }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, fontSize: 12, color: LIGHT_SURFACE.ink2 }}>
              <span style={{ marginRight: 4 }}>You&apos;ll get findings tagged</span>
              {(Object.keys(CONCERN_CHIP_LABEL) as RoleAuditConcern[]).map((concern) => (
                <span key={concern} title={CONCERN_LABEL[concern]}>
                  <UIChip tone={CONCERN_TONE[concern]} size="sm" variant="tint">{CONCERN_CHIP_LABEL[concern]}</UIChip>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <UIButton
                variant="primary"
                size="lg"
                onClick={() => onRun(criteria)}
                disabled={runDisabled || nothingToCheck}
                loading={isPending}
                leading={!isPending ? <SparkleIcon size={16} /> : undefined}
              >
                {isPending ? `Auditing ${subjects.length} people…` : "Run audit"}
              </UIButton>
              {nothingToCheck && <span style={{ fontSize: 12, color: LIGHT_SURFACE.ink2 }}>Pick a check or add an instruction</span>}
              {isLoadingEmployees && !isPending && <span style={{ fontSize: 12, color: LIGHT_SURFACE.ink2 }}>Loading employee profiles…</span>}
            </div>
          </footer>
        </div>

        {error && (
          <p style={{
            marginTop: 16,
            borderRadius: 10,
            background: LIGHT_TONES.danger.tint,
            color: LIGHT_TONES.danger.fg,
            padding: "10px 16px",
            fontSize: 12,
            boxShadow: `inset 0 0 0 1px ${LIGHT_TONES.danger.dot}33`,
          }}>{error}</p>
        )}

        <p style={{
          marginTop: 16,
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          fontSize: 12,
          lineHeight: 1.6,
          color: LIGHT_SURFACE.ink2,
        }}>
          <svg viewBox="0 0 16 16" width={14} height={14} style={{ marginTop: 1, flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
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
          <Space size={8}>
            <UIButton variant="secondary" size="sm" onClick={() => exportAuditToCsv(result)}>Export CSV</UIButton>
            <UIButton variant="secondary" size="sm" onClick={() => { onResult(undefined); onClearAuditCount(); }}>Clear</UIButton>
            <UIButton
              variant="primary"
              size="sm"
              onClick={() => onRun(criteria)}
              disabled={runDisabled}
              loading={isPending}
              leading={!isPending ? <SparkleIcon size={14} /> : undefined}
            >
              {isPending ? "Auditing…" : "Run again"}
            </UIButton>
          </Space>
        }
      />

      <div style={{
        borderRadius: 10,
        border: `1px solid ${LIGHT_TONES.info.dot}55`,
        background: `${LIGHT_TONES.info.tint}80`,
        padding: "12px 16px",
        fontSize: 14,
        lineHeight: 1.6,
        color: LIGHT_SURFACE.ink,
      }}>
        {result.summary}
      </div>

      {auditSubjectCount !== undefined && auditSubjectCount !== subjects.length && (
        <p style={{
          marginTop: 12,
          borderRadius: 10,
          background: LIGHT_TONES.warning.tint,
          color: LIGHT_TONES.warning.fg,
          padding: "10px 16px",
          fontSize: 12,
          boxShadow: `inset 0 0 0 1px ${LIGHT_TONES.warning.dot}33`,
        }}>
          The roster has changed since this audit ran ({auditSubjectCount} to {subjects.length} people). Run again for up-to-date results.
        </p>
      )}
      {error && (
        <p style={{
          marginTop: 12,
          borderRadius: 10,
          background: LIGHT_TONES.danger.tint,
          color: LIGHT_TONES.danger.fg,
          padding: "10px 16px",
          fontSize: 12,
          boxShadow: `inset 0 0 0 1px ${LIGHT_TONES.danger.dot}33`,
        }}>{error}</p>
      )}

      {visible.length === 0 ? (
        <div style={{ marginTop: 12 }}>
          <EmptyState
            icon={null}
            title={result.findings.length === 0 ? "No mismatches found" : "All findings resolved"}
            description={result.findings.length === 0
              ? "Every role looks appropriate given the current roster."
              : "You've applied or ignored every finding. Run again to refresh."}
          />
        </div>
      ) : (
        <ul style={{ marginTop: 12, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
          {visible.map((f) => (
            <li key={`${f.employeeId}-${f.concern}`} style={{
              borderRadius: 10,
              border: `1px solid ${LIGHT_SURFACE.line}`,
              background: LIGHT_SURFACE.surface,
              padding: 16,
              boxShadow: "0 1px 2px rgba(27, 26, 23, 0.04)",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <UIAvatar user={{ name: f.employeeName, email: f.employeeId }} size="md" />
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: LIGHT_SURFACE.ink }}>{f.employeeName}</p>
                    <p style={{ margin: 0, fontSize: 14, color: LIGHT_SURFACE.ink2 }}>{describeRole(f.currentRole)}</p>
                  </div>
                </div>
                <span title={CONCERN_LABEL[f.concern]}>
                  <UIChip tone={CONCERN_TONE[f.concern]} size="sm" variant="tint">{CONCERN_CHIP_LABEL[f.concern]}</UIChip>
                </span>
              </div>
              {f.rationale && (
                <p style={{ marginTop: 12, marginBottom: 0, fontSize: 14, lineHeight: 1.6, color: LIGHT_SURFACE.ink2 }}>
                  {f.rationale}
                </p>
              )}
              <div style={{
                marginTop: 16,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                borderRadius: 10,
                background: LIGHT_SURFACE.canvas,
                padding: "12px 16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500, color: LIGHT_SURFACE.ink }}>
                  <span style={{
                    borderRadius: 6,
                    background: LIGHT_SURFACE.surface,
                    padding: "4px 10px",
                    boxShadow: `inset 0 0 0 1px ${LIGHT_SURFACE.line}`,
                  }}>{describeRole(f.currentRole)}</span>
                  {f.suggestedRole && (
                    <>
                      <span style={{ color: LIGHT_SURFACE.ink2 }}>→</span>
                      <span style={{
                        borderRadius: 6,
                        background: LIGHT_SURFACE.surface,
                        padding: "4px 10px",
                        boxShadow: `inset 0 0 0 1px ${LIGHT_SURFACE.line}`,
                      }}>
                        {f.suggestedRole === "NONE" ? "Remove access" : describeRole(f.suggestedRole)}
                      </span>
                    </>
                  )}
                </div>
                <Space size={8}>
                  <UIButton variant="secondary" size="sm" onClick={() => setIgnoredKeys((prev) => new Set([...prev, `${f.employeeId}-${f.concern}`]))}>Ignore</UIButton>
                  {f.suggestedRole && (
                    <UIButton variant="primary" size="sm" onClick={() => setApplyConfirm(f)} disabled={pendingApply}>Apply suggestion</UIButton>
                  )}
                </Space>
              </div>
            </li>
          ))}
        </ul>
      )}

      <UIModal
        open={!!applyConfirm}
        onClose={closeApplyConfirm}
        title="Apply role suggestion"
        footer={
          <Space>
            <UIButton variant="secondary" onClick={() => { setApplyConfirm(undefined); setApplyError(undefined); }} disabled={pendingApply}>Cancel</UIButton>
            <UIButton
              variant="primary"
              onClick={() => {
                const f = applyConfirm;
                if (!f) return;
                setApplyError(undefined);
                const grants: UserAppRoleGrant[] =
                  f.suggestedRole === "NONE" || !f.suggestedRole
                    ? []
                    : [{ roleCode: f.suggestedRole, departmentCode: WILDCARD_SCOPE, costCenterCode: WILDCARD_SCOPE }];
                replaceGrants.mutate(
                  { email: f.employeeId, grants },
                  {
                    onSuccess: () => {
                      onResult({ ...result, findings: result.findings.filter((x) => !(x.employeeId === f.employeeId && x.concern === f.concern)) });
                      setApplyConfirm(undefined);
                    },
                    onError: (err) => {
                      setApplyError(err instanceof Error ? err.message : "Failed to apply suggestion — please try again.");
                    },
                  }
                );
              }}
              disabled={pendingApply || (applyConfirm?.employeeId.toLowerCase() === currentUserEmail.toLowerCase())}
              loading={pendingApply}
            >
              {pendingApply ? "Applying…" : "Apply"}
            </UIButton>
          </Space>
        }
      >
        {applyConfirm && (
          <>
            <p style={{ margin: 0, fontSize: 14, color: LIGHT_SURFACE.ink }}>
              Change <span style={{ fontWeight: 600 }}>{applyConfirm.employeeName}</span>&apos;s role from{" "}
              <span style={{ fontWeight: 600 }}>{describeRole(applyConfirm.currentRole)}</span> to{" "}
              <span style={{ fontWeight: 600 }}>{describeRole(applyConfirm.suggestedRole!)}</span>? Their access changes immediately.
            </p>
            {applyConfirm.rationale && (
              <p style={{ marginTop: 8, marginBottom: 0, fontSize: 12, color: LIGHT_SURFACE.ink2 }}>
                {applyConfirm.rationale}
              </p>
            )}
            {applyConfirm.employeeId.toLowerCase() === currentUserEmail.toLowerCase() && (
              <p style={{ marginTop: 8, marginBottom: 0, fontSize: 12, color: LIGHT_TONES.warning.fg }}>
                You can&apos;t change your own role from this screen.
              </p>
            )}
            {applyError && (
              <p style={{ marginTop: 8, marginBottom: 0, fontSize: 12, color: LIGHT_TONES.danger.fg }}>
                {applyError}
              </p>
            )}
            {applyConfirm.suggestedRole === "NONE" && (
              <p style={{ marginTop: 8, marginBottom: 0, fontSize: 12, color: LIGHT_TONES.warning.fg }}>
                No Access removes every capability — they will no longer be able to use this app.
              </p>
            )}
          </>
        )}
      </UIModal>
    </div>
  );
}
