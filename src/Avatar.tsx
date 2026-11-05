import { Avatar as AntAvatar, Tooltip } from "antd";

export type AvatarSize = "xs" | "sm" | "md" | "lg";
export type AvatarShape = "circle" | "rounded";

export interface AvatarUser {
  name: string;
  email?: string;
  avatarUrl?: string;
}

export interface AvatarProps {
  user: AvatarUser;
  size?: AvatarSize;
  shape?: AvatarShape;
  showTooltip?: boolean;
}

const PX: Record<AvatarSize, number> = { xs: 20, sm: 28, md: 36, lg: 48 };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const HUE_SEEDS = 24;
function hueFor(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return (h % HUE_SEEDS) * (360 / HUE_SEEDS);
}

export function Avatar({ user, size = "md", shape = "circle", showTooltip = false }: AvatarProps) {
  const px = PX[size];
  const key = user.email ?? user.name;
  const hue = hueFor(key);
  const bg = `hsl(${hue}deg 55% 88%)`;
  const fg = `hsl(${hue}deg 55% 24%)`;

  const avatar = (
    <AntAvatar
      src={user.avatarUrl}
      alt={user.name}
      shape={shape === "rounded" ? "square" : "circle"}
      size={px}
      style={{
        backgroundColor: bg,
        color: fg,
        fontSize: px * 0.4,
        fontWeight: 600,
        borderRadius: shape === "rounded" ? 6 : undefined,
      }}
    >
      <span aria-hidden="true">{initials(user.name)}</span>
    </AntAvatar>
  );

  if (!showTooltip) return avatar;
  return (
    <Tooltip title={user.email ? `${user.name} · ${user.email}` : user.name}>
      <span style={{ display: "inline-flex" }}>{avatar}</span>
    </Tooltip>
  );
}
