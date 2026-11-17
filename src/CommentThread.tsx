import { Spin, theme } from "antd";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { Chip } from "./Chip";
import { MeatballMenu, type MenuItem } from "./Menu";
import type { UserRef } from "./PeoplePicker";
import { TextArea } from "./TextArea";

/**
 * CommentThread — Bucket 7 "heavy workflow" component.
 *
 * Presentational by default: pass `comments` + `onPost` and own the data flow
 * yourself. For callers that want optimistic updates and polling, the paired
 * `useCommentThread` hook provides headless state management over three
 * adapter callbacks (`fetch`, `post`, optional `resolve` / `remove`).
 *
 * Scope for v1 (keep this list honest):
 *   - Parent → one level of replies (no deeper nesting)
 *   - Resolve / unresolve / delete actions (gated by capability props)
 *   - No markdown / no reactions / no read receipts / no inline @-mentions
 *     in this version (callers can still store `mentions` on the Comment
 *     data; they just aren't rendered specially)
 */

export interface Comment {
  id: string;
  body: string;
  author: UserRef;
  createdAt: string | Date;
  parentCommentId?: string;
  mentions?: UserRef[];
  resolvedAt?: string | Date | null;
}

export interface CommentThreadDraft {
  body: string;
  mentions?: UserRef[];
  parentCommentId?: string;
}

export interface CommentThreadProps {
  comments: Comment[];
  currentActor: UserRef;
  onPost: (draft: CommentThreadDraft) => Promise<void>;
  onResolve?: (commentId: string) => Promise<void>;
  onUnresolve?: (commentId: string) => Promise<void>;
  onDelete?: (commentId: string) => Promise<void>;
  loading?: boolean;
  posting?: boolean;
  readOnly?: boolean;
  /** Surface fetch / mutation failures. Rendered as an inline banner above
   *  the list. Accepts an Error (displays `.message`) or any ReactNode. */
  error?: Error | ReactNode;
  emptyState?: ReactNode;
  title?: ReactNode;
  maxHeight?: number | string;
  showResolved?: boolean;
}

export function CommentThread({
  comments,
  currentActor,
  onPost,
  onResolve,
  onUnresolve,
  onDelete,
  loading = false,
  posting = false,
  readOnly = false,
  error,
  emptyState,
  title = "Discussion",
  maxHeight,
  showResolved = true,
}: CommentThreadProps) {
  const { token } = theme.useToken();
  const [draft, setDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | undefined>(undefined);
  const [replyDraft, setReplyDraft] = useState("");
  const [showingResolved, setShowingResolved] = useState(showResolved);
  const [localError, setLocalError] = useState<Error | null>(null);

  const grouped = useMemo(() => groupByThread(comments), [comments]);
  const visibleGroups = showingResolved
    ? grouped
    : grouped.filter((g) => !g.parent.resolvedAt);
  const hiddenCount = grouped.length - visibleGroups.length;

  // If the comments array no longer contains the parent the user is replying
  // to (e.g. it was deleted by another tab / realtime update), treat the
  // composer as closed — don't render it, don't let the draft get retargeted.
  // We don't clear the underlying state in an effect (cascading render) —
  // the next `onStartReply` will clear the draft anyway.
  const effectiveReplyingTo =
    replyingTo && comments.some((c) => c.id === replyingTo) ? replyingTo : undefined;

  const handlePostTop = async () => {
    const body = draft.trim();
    if (!body || posting || readOnly) return;
    try {
      setLocalError(null);
      await onPost({ body });
      setDraft("");
    } catch (e) {
      // Keep the draft so the user can retry without re-typing, but surface
      // the failure so they know it didn't go through.
      setLocalError(e instanceof Error ? e : new Error(String(e)));
    }
  };

  const handlePostReply = async (parentCommentId: string) => {
    const body = replyDraft.trim();
    if (!body || posting || readOnly) return;
    try {
      setLocalError(null);
      await onPost({ body, parentCommentId });
      setReplyDraft("");
      setReplyingTo(undefined);
    } catch (e) {
      setLocalError(e instanceof Error ? e : new Error(String(e)));
    }
  };

  const displayError = error ?? localError;
  const errorNode =
    displayError instanceof Error ? displayError.message : displayError;

  const container: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    borderRadius: token.borderRadiusLG,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    minHeight: 160,
  };

  const header: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 16px",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  };

  const list: CSSProperties = {
    maxHeight,
    overflow: maxHeight ? "auto" : undefined,
    display: "flex",
    flexDirection: "column",
  };

  return (
    <div style={container}>
      <div style={header}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: token.colorText }}>{title}</span>
          <span style={{ fontSize: 12, color: token.colorTextSecondary }}>
            {grouped.length} {grouped.length === 1 ? "thread" : "threads"}
          </span>
        </div>
        {hiddenCount > 0 && !showingResolved && (
          <Button variant="link" size="sm" onClick={() => setShowingResolved(true)}>
            Show {hiddenCount} resolved
          </Button>
        )}
        {showingResolved && grouped.some((g) => g.parent.resolvedAt) && (
          <Button variant="link" size="sm" onClick={() => setShowingResolved(false)}>
            Hide resolved
          </Button>
        )}
      </div>

      {errorNode && (
        <div
          role="alert"
          style={{
            margin: "10px 16px 0",
            padding: "8px 12px",
            borderRadius: 6,
            background: token.colorErrorBg,
            border: `1px solid ${token.colorErrorBorder}`,
            color: token.colorErrorText,
            fontSize: 13,
          }}
        >
          {errorNode}
        </div>
      )}

      {loading && comments.length === 0 ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
          <Spin size="small" />
        </div>
      ) : visibleGroups.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: token.colorTextSecondary, fontSize: 13 }}>
          {emptyState ?? "No comments yet. Start the conversation."}
        </div>
      ) : (
        <div style={list}>
          {visibleGroups.map((group, idx) => (
            <CommentGroup
              key={group.parent.id}
              group={group}
              currentActor={currentActor}
              onResolve={onResolve}
              onUnresolve={onUnresolve}
              onDelete={onDelete}
              readOnly={readOnly}
              isLast={idx === visibleGroups.length - 1}
              replyingTo={effectiveReplyingTo}
              onStartReply={(id) => {
                setReplyingTo(id);
                setReplyDraft("");
              }}
              onCancelReply={() => {
                setReplyingTo(undefined);
                setReplyDraft("");
              }}
              replyDraft={replyDraft}
              onReplyDraftChange={setReplyDraft}
              onSubmitReply={() => handlePostReply(group.parent.id)}
              posting={posting}
            />
          ))}
        </div>
      )}

      {!readOnly && (
        <div
          style={{
            padding: "12px 16px",
            borderTop: `1px solid ${token.colorBorderSecondary}`,
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <Avatar user={currentActor} size="sm" />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <TextArea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a comment…"
              rows={2}
              onKeyDown={(e) => handleSubmitShortcut(e, handlePostTop)}
              disabled={posting}
              aria-label="New comment"
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  color: token.colorTextTertiary,
                  alignSelf: "center",
                  marginRight: "auto",
                }}
              >
                ⌘/Ctrl + Enter to post
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePostTop}
                loading={posting}
                disabled={!draft.trim() || posting}
              >
                Post
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface CommentGroupProps {
  group: ThreadGroup;
  currentActor: UserRef;
  onResolve?: (id: string) => Promise<void>;
  onUnresolve?: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  readOnly: boolean;
  isLast: boolean;
  replyingTo: string | undefined;
  onStartReply: (parentId: string) => void;
  onCancelReply: () => void;
  replyDraft: string;
  onReplyDraftChange: (next: string) => void;
  onSubmitReply: () => void;
  posting: boolean;
}

function CommentGroup({
  group,
  currentActor,
  onResolve,
  onUnresolve,
  onDelete,
  readOnly,
  isLast,
  replyingTo,
  onStartReply,
  onCancelReply,
  replyDraft,
  onReplyDraftChange,
  onSubmitReply,
  posting,
}: CommentGroupProps) {
  const { token } = theme.useToken();
  const resolved = Boolean(group.parent.resolvedAt);

  const style: CSSProperties = {
    padding: "14px 16px",
    borderBottom: isLast ? undefined : `1px solid ${token.colorBorderSecondary}`,
    background: resolved ? token.colorFillQuaternary : undefined,
    opacity: resolved ? 0.78 : 1,
  };

  return (
    <div style={style}>
      <CommentRow
        comment={group.parent}
        currentActor={currentActor}
        onResolve={onResolve}
        onUnresolve={onUnresolve}
        onDelete={onDelete}
        readOnly={readOnly}
        onReply={() => onStartReply(group.parent.id)}
        isReply={false}
      />
      {group.replies.length > 0 && (
        <div style={{ marginLeft: 44, marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          {group.replies.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              currentActor={currentActor}
              onDelete={onDelete}
              readOnly={readOnly}
              isReply
            />
          ))}
        </div>
      )}
      {replyingTo === group.parent.id && !readOnly && (
        <div style={{ marginLeft: 44, marginTop: 12, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Avatar user={currentActor} size="sm" />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <TextArea
              value={replyDraft}
              onChange={(e) => onReplyDraftChange(e.target.value)}
              placeholder="Reply…"
              rows={2}
              autoFocus
              onKeyDown={(e) => handleSubmitShortcut(e, onSubmitReply)}
              disabled={posting}
              aria-label="Reply"
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button variant="ghost" size="sm" onClick={onCancelReply}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={onSubmitReply}
                loading={posting}
                disabled={!replyDraft.trim() || posting}
              >
                Reply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface CommentRowProps {
  comment: Comment;
  currentActor: UserRef;
  onResolve?: (id: string) => Promise<void>;
  onUnresolve?: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  readOnly: boolean;
  isReply: boolean;
  onReply?: () => void;
}

function CommentRow({
  comment,
  currentActor,
  onResolve,
  onUnresolve,
  onDelete,
  readOnly,
  isReply,
  onReply,
}: CommentRowProps) {
  const { token } = theme.useToken();
  const resolved = Boolean(comment.resolvedAt);
  const isOwn = sameActor(currentActor, comment.author);

  const menuItems: MenuItem[] = [];
  if (!isReply && !readOnly) {
    if (resolved && onUnresolve) {
      menuItems.push({ id: "reopen", label: "Reopen thread" });
    } else if (!resolved && onResolve) {
      menuItems.push({ id: "resolve", label: "Mark resolved" });
    }
  }
  if (isOwn && onDelete && !readOnly) {
    menuItems.push({ id: "delete", label: "Delete", danger: true });
  }

  const handleMenuSelect = (id: string) => {
    // Swallow intentionally; consumer-level error UX is their call. We still
    // surface the rejection to console.error so it doesn't become a silent
    // unhandled-rejection in the browser.
    const guard = (p: Promise<void> | undefined) =>
      p?.catch((err: unknown) => {
        console.error("CommentThread menu action failed", err);
      });
    if (id === "resolve" && onResolve) guard(onResolve(comment.id));
    else if (id === "reopen" && onUnresolve) guard(onUnresolve(comment.id));
    else if (id === "delete" && onDelete) guard(onDelete(comment.id));
  };

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <Avatar user={comment.author} size="sm" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: token.colorText }}>
            {comment.author.name}
          </span>
          <span style={{ fontSize: 12, color: token.colorTextTertiary }}>
            {formatRelativeTime(comment.createdAt)}
          </span>
          {resolved && !isReply && (
            <Chip tone="success" size="sm" variant="tint">
              Resolved
            </Chip>
          )}
        </div>
        <div
          style={{
            fontSize: 13.5,
            color: token.colorText,
            marginTop: 4,
            lineHeight: 1.55,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {comment.body}
        </div>
        {!readOnly && !resolved && !isReply && onReply && (
          <div style={{ marginTop: 6 }}>
            <Button variant="link" size="sm" onClick={onReply}>
              Reply
            </Button>
          </div>
        )}
      </div>
      {menuItems.length > 0 && <MeatballMenu items={menuItems} onSelect={handleMenuSelect} align="end" />}
    </div>
  );
}

function handleSubmitShortcut(e: KeyboardEvent<HTMLTextAreaElement>, submit: () => void) {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    submit();
  }
}

interface ThreadGroup {
  parent: Comment;
  replies: Comment[];
}

function groupByThread(comments: Comment[]): ThreadGroup[] {
  const parentIds = new Set<string>();
  const parents: Comment[] = [];
  for (const c of comments) {
    if (!c.parentCommentId) {
      parentIds.add(c.id);
      parents.push(c);
    }
  }
  const repliesByParent = new Map<string, Comment[]>();
  const orphans: string[] = [];
  for (const c of comments) {
    if (!c.parentCommentId) continue;
    if (!parentIds.has(c.parentCommentId)) {
      orphans.push(c.id);
      continue;
    }
    const arr = repliesByParent.get(c.parentCommentId) ?? [];
    arr.push(c);
    repliesByParent.set(c.parentCommentId, arr);
  }
  if (orphans.length > 0 && typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
    console.warn(
      `CommentThread: dropped ${orphans.length} reply/replies whose parent is not in the comments array: ${orphans.join(", ")}`,
    );
  }
  parents.sort((a, b) => toTime(a.createdAt) - toTime(b.createdAt));
  for (const [, arr] of repliesByParent) {
    arr.sort((a, b) => toTime(a.createdAt) - toTime(b.createdAt));
  }
  return parents.map((p) => ({ parent: p, replies: repliesByParent.get(p.id) ?? [] }));
}

function toTime(d: string | Date): number {
  return (d instanceof Date ? d : new Date(d)).getTime();
}

function sameActor(a: UserRef, b: UserRef): boolean {
  if (a.email && b.email) return a.email.toLowerCase() === b.email.toLowerCase();
  return a.id === b.id;
}

function formatRelativeTime(d: string | Date): string {
  const date = d instanceof Date ? d : new Date(d);
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ─── Headless state hook ──────────────────────────────────────────────────

export interface UseCommentThreadOptions {
  fetch: () => Promise<Comment[]>;
  post: (draft: CommentThreadDraft) => Promise<Comment>;
  resolve?: (id: string) => Promise<void>;
  unresolve?: (id: string) => Promise<void>;
  remove?: (id: string) => Promise<void>;
  /** Optional polling interval (ms). Omit for fetch-on-mount only.
   *  Values below 1000 ms are clamped to 1 s to avoid accidental API hammering. */
  pollMs?: number;
}

export interface UseCommentThreadResult {
  comments: Comment[];
  loading: boolean;
  posting: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  post: (draft: CommentThreadDraft) => Promise<void>;
  resolve?: (id: string) => Promise<void>;
  unresolve?: (id: string) => Promise<void>;
  remove?: (id: string) => Promise<void>;
}

/**
 * Headless comment-thread state: fetch, optimistic post, optimistic resolve /
 * unresolve / delete, optional polling. Consumers pass this straight into
 * `<CommentThread />` via `comments`, `onPost`, `onResolve`, `onUnresolve`,
 * `onDelete`, `loading`, `posting`, `error`.
 *
 * Scoping: this hook is entity-agnostic — if the caller wires it to a
 * different entity, it's their responsibility to re-mount the component (with
 * a stable `key`) or close a new adapter set over the new entity id.
 */
export function useCommentThread(opts: UseCommentThreadOptions): UseCommentThreadResult {
  const { fetch, post, resolve, unresolve, remove, pollMs } = opts;
  // Pin the latest adapter callbacks in an effect (not during render — ref
  // writes during render are unsafe under concurrent mode) so the memoized
  // callbacks below can read the current adapters without re-registering.
  const adaptersRef = useRef({ fetch, post, resolve, unresolve, remove });
  useEffect(() => {
    adaptersRef.current = { fetch, post, resolve, unresolve, remove };
  });

  // Mount flag + monotonic request id so late-returning adapters cannot
  // overwrite newer state (unmount, racing poll vs. optimistic post, etc.).
  const aliveRef = useRef(true);
  const reqIdRef = useRef(0);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    try {
      const items = await adaptersRef.current.fetch();
      if (!aliveRef.current || reqId !== reqIdRef.current) return;
      setComments(items);
      setError(null);
    } catch (e) {
      if (!aliveRef.current || reqId !== reqIdRef.current) return;
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      if (aliveRef.current && reqId === reqIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    // No interval when polling disabled; `typeof window === "undefined"`
    // guards SSR / Node environments where `window.setInterval` is absent.
    if (!pollMs || typeof window === "undefined") return;
    const clamped = Math.max(1000, pollMs);
    const id = window.setInterval(refresh, clamped);
    return () => window.clearInterval(id);
  }, [refresh, pollMs]);

  const postCb = useCallback(async (draft: CommentThreadDraft) => {
    setPosting(true);
    try {
      const created = await adaptersRef.current.post(draft);
      if (!aliveRef.current) return;
      setComments((prev) => [...prev, created]);
      setError(null);
    } catch (e) {
      if (aliveRef.current) {
        setError(e instanceof Error ? e : new Error(String(e)));
      }
      throw e;
    } finally {
      if (aliveRef.current) setPosting(false);
    }
  }, []);

  const resolveCb = useCallback(async (id: string) => {
    const impl = adaptersRef.current.resolve;
    if (!impl) return;
    try {
      await impl(id);
      if (!aliveRef.current) return;
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, resolvedAt: new Date().toISOString() } : c)),
      );
    } catch (e) {
      if (aliveRef.current) {
        setError(e instanceof Error ? e : new Error(String(e)));
      }
      throw e;
    }
  }, []);

  const unresolveCb = useCallback(async (id: string) => {
    const impl = adaptersRef.current.unresolve;
    if (!impl) return;
    try {
      await impl(id);
      if (!aliveRef.current) return;
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, resolvedAt: null } : c)),
      );
    } catch (e) {
      if (aliveRef.current) {
        setError(e instanceof Error ? e : new Error(String(e)));
      }
      throw e;
    }
  }, []);

  const removeCb = useCallback(async (id: string) => {
    const impl = adaptersRef.current.remove;
    if (!impl) return;
    try {
      await impl(id);
      if (!aliveRef.current) return;
      setComments((prev) => prev.filter((c) => c.id !== id && c.parentCommentId !== id));
    } catch (e) {
      if (aliveRef.current) {
        setError(e instanceof Error ? e : new Error(String(e)));
      }
      throw e;
    }
  }, []);

  return {
    comments,
    loading,
    posting,
    error,
    refresh,
    post: postCb,
    resolve: resolve ? resolveCb : undefined,
    unresolve: unresolve ? unresolveCb : undefined,
    remove: remove ? removeCb : undefined,
  };
}
