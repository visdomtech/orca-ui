import { Card as AntCard } from "antd";
import type { CSSProperties, ElementType, ReactNode } from "react";

export type CardPadding = "sm" | "md" | "lg" | "none";

export interface CardProps {
  padding?: CardPadding;
  interactive?: boolean;
  as?: ElementType;
  onClick?: () => void;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}

const PADDING_MAP: Record<CardPadding, string | number> = {
  none: 0,
  sm: 12,
  md: 20,
  lg: 28,
};

export function Card({
  padding = "md",
  interactive = false,
  onClick,
  children,
  style,
  className,
}: CardProps) {
  return (
    <AntCard
      hoverable={interactive}
      onClick={onClick}
      className={className}
      styles={{ body: { padding: PADDING_MAP[padding] } }}
      style={{
        ...(interactive ? { cursor: "pointer" } : {}),
        ...style,
      }}
    >
      {children}
    </AntCard>
  );
}

export interface CardSectionProps {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}

function CardHeader({ children, style, className }: CardSectionProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 12,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function CardBody({ children, style, className }: CardSectionProps) {
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

function CardFooter({ children, style, className }: CardSectionProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 8,
        marginTop: 16,
        paddingTop: 12,
        borderTop: "1px solid rgba(5, 5, 5, 0.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
