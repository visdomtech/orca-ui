import { ArrowDownOutlined, ArrowUpOutlined, MinusOutlined } from "@ant-design/icons";
import { theme } from "antd";
import type { CSSProperties, ReactNode } from "react";

import { Sparkline, type SparklineProps } from "./Sparkline";

export type KpiDeltaDirection = "up" | "down" | "flat";
export type KpiDeltaTone = "positive" | "negative" | "neutral";

export interface KpiDelta {
  value: ReactNode;
  direction?: KpiDeltaDirection;
  tone?: KpiDeltaTone;
}

export interface KpiTileProps {
  label: string;
  value: ReactNode;
  delta?: KpiDelta;
  sparkline?: Omit<SparklineProps, "width" | "height">;
  footnote?: ReactNode;
  onClick?: () => void;
}

function DeltaIcon({ direction }: { direction: KpiDeltaDirection }) {
  if (direction === "up") return <ArrowUpOutlined style={{ fontSize: 11 }} />;
  if (direction === "down") return <ArrowDownOutlined style={{ fontSize: 11 }} />;
  return <MinusOutlined style={{ fontSize: 11 }} />;
}

export function KpiTile({ label, value, delta, sparkline, footnote, onClick }: KpiTileProps) {
  const { token } = theme.useToken();
  const interactive = Boolean(onClick);

  const deltaBg: Record<KpiDeltaTone, string> = {
    positive: token.colorSuccessBg,
    negative: token.colorErrorBg,
    neutral: token.colorFillTertiary,
  };
  const deltaFg: Record<KpiDeltaTone, string> = {
    positive: token.colorSuccess,
    negative: token.colorError,
    neutral: token.colorTextSecondary,
  };

  const rootStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: 18,
    borderRadius: token.borderRadiusLG,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    minHeight: 120,
    textAlign: "left",
    font: "inherit",
    cursor: interactive ? "pointer" : undefined,
    transition: "border-color 0.15s, box-shadow 0.2s, transform 0.2s",
  };

  const Comp: "button" | "div" = interactive ? "button" : "div";
  return (
    <Comp
      type={interactive ? "button" : undefined}
      onClick={onClick}
      style={rootStyle}
      onMouseEnter={(e) => {
        if (interactive) {
          (e.currentTarget as HTMLElement).style.borderColor = token.colorPrimary;
          (e.currentTarget as HTMLElement).style.boxShadow = token.boxShadowSecondary;
          (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        if (interactive) {
          (e.currentTarget as HTMLElement).style.borderColor = token.colorBorderSecondary;
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
          (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        }
      }}
    >
      <span
        style={{
          color: token.colorTextSecondary,
          fontWeight: 650,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontSize: 11,
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 28,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
            color: token.colorText,
          }}
        >
          {value}
        </span>
        {delta && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              padding: "2px 8px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 650,
              lineHeight: 1,
              background: deltaBg[delta.tone ?? "neutral"],
              color: deltaFg[delta.tone ?? "neutral"],
            }}
          >
            {delta.direction && <DeltaIcon direction={delta.direction} />}
            {delta.value}
          </span>
        )}
      </div>
      {sparkline && (
        <div style={{ marginTop: 6, marginBottom: footnote ? 0 : 2 }}>
          <Sparkline {...sparkline} width={140} height={30} />
        </div>
      )}
      {footnote && (
        <span style={{ fontSize: 12, color: token.colorTextSecondary, marginTop: "auto" }}>
          {footnote}
        </span>
      )}
    </Comp>
  );
}

export interface KpiRowProps {
  children: ReactNode;
  columns?: number;
  gap?: number;
}

export function KpiRow({ children, columns, gap = 16 }: KpiRowProps) {
  return (
    <div
      style={{
        display: "grid",
        gap,
        gridTemplateColumns: columns
          ? `repeat(${columns}, 1fr)`
          : "repeat(auto-fit, minmax(180px, 1fr))",
      }}
    >
      {children}
    </div>
  );
}
