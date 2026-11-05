import { Avatar as AntAvatar } from "antd";

export interface UserChipProps {
  name: string;
  title?: string;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg";
}

const AVATAR_SIZE = { sm: 28, md: 36, lg: 44 } as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserChip({ name, title, avatarUrl, size = "md" }: UserChipProps) {
  const avatarSize = AVATAR_SIZE[size];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <AntAvatar
        src={avatarUrl}
        alt={name}
        size={avatarSize}
        style={{
          fontSize: avatarSize * 0.38,
          fontWeight: 600,
          flexShrink: 0,
          background: "#1677FF",
          color: "#fff",
        }}
      >
        <span aria-hidden="true">{initials(name)}</span>
      </AntAvatar>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: size === "lg" ? 14 : 13,
            fontWeight: 500,
            color: "rgba(0,0,0,0.88)",
            lineHeight: 1.3,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {name}
        </div>
        {title ? (
          <div
            style={{
              fontSize: size === "lg" ? 12 : 11,
              color: "rgba(0,0,0,0.45)",
              lineHeight: 1.3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </div>
        ) : null}
      </div>
    </div>
  );
}
