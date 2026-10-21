import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";

export interface UserChipProps {
  name: string;
  title?: string;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg";
  sx?: SxProps<Theme>;
}

const AVATAR_SIZE = { sm: 28, md: 36, lg: 44 } as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserChip({ name, title, avatarUrl, size = "md", sx }: UserChipProps) {
  const avatarSize = AVATAR_SIZE[size];
  return (
    <Box
      sx={[
        { display: "flex", alignItems: "center", gap: 1.5 },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      <Avatar
        src={avatarUrl}
        aria-label={name}
        sx={{
          width: avatarSize,
          height: avatarSize,
          fontSize: avatarSize * 0.38,
          fontWeight: 600,
          bgcolor: "primary.main",
          flexShrink: 0,
        }}
      >
        <span aria-hidden="true">{initials(name)}</span>
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant={size === "lg" ? "body1" : "body2"}
          sx={{ fontWeight: 500, color: "text.primary", lineHeight: 1.3 }}
          noWrap
        >
          {name}
        </Typography>
        {title ? (
          <Typography
            variant={size === "lg" ? "body2" : "caption"}
            sx={{ color: "text.secondary", lineHeight: 1.3, display: "block" }}
            noWrap
          >
            {title}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}
