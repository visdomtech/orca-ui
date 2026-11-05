import { Skeleton as AntSkeleton } from "antd";
import type { CSSProperties, ReactNode } from "react";

export interface SkeletonProps {
  variant?: "text" | "rectangular" | "circular";
  width?: number | string;
  height?: number | string;
  style?: CSSProperties;
}

export function Skeleton({ variant = "text", width, height, style }: SkeletonProps) {
  if (variant === "circular") {
    return <AntSkeleton.Avatar active size={typeof width === "number" ? width : undefined} style={style} />;
  }
  if (variant === "rectangular") {
    return (
      <AntSkeleton.Node active style={{ ...style, width, height: height ?? 60 }}>
        <span />
      </AntSkeleton.Node>
    );
  }
  return <AntSkeleton.Input active size="small" style={{ ...style, width, height }} block />;
}

export interface SkeletonTextProps {
  lines?: number;
  lastLineWidth?: number | string;
  gap?: number;
  children?: ReactNode;
}

export function SkeletonText({ lines = 3 }: SkeletonTextProps) {
  return <AntSkeleton active paragraph={{ rows: Math.max(1, lines - 1) }} title={false} />;
}

export interface SkeletonBlockProps {
  height?: number | string;
  width?: number | string;
  radius?: number;
  style?: CSSProperties;
}

export function SkeletonBlock({ height = 120, width = "100%", radius = 8, style }: SkeletonBlockProps) {
  return (
    <AntSkeleton.Node active style={{ ...style, width, height, borderRadius: radius }}>
      <span />
    </AntSkeleton.Node>
  );
}
