import { Tooltip as AntTooltip } from "antd";
import type { ReactElement, ReactNode } from "react";

export type TooltipPlacement =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "topLeft"
  | "topRight"
  | "bottomLeft"
  | "bottomRight"
  | "leftTop"
  | "leftBottom"
  | "rightTop"
  | "rightBottom";

export interface TooltipProps {
  content: ReactNode;
  placement?: TooltipPlacement;
  delay?: number;
  arrow?: boolean;
  children: ReactElement;
}

export function Tooltip({ content, placement = "top", delay = 0.15, arrow = true, children }: TooltipProps) {
  if (content === null || content === undefined || content === "") return children;
  return (
    <AntTooltip title={content} placement={placement} mouseEnterDelay={delay} arrow={arrow}>
      {children}
    </AntTooltip>
  );
}
