import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export type TwoPaneSplit = "fixed" | "resizable";

export interface TwoPaneProps {
  left: ReactNode;
  right: ReactNode;
  split?: TwoPaneSplit;
  leftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
}

const ROOT_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  width: "100%",
  height: "100%",
  minHeight: 0,
};

const RIGHT_STYLE: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "auto",
};

export function TwoPane({
  left,
  right,
  split = "fixed",
  leftWidth = 320,
  minLeftWidth = 200,
  maxLeftWidth = 640,
}: TwoPaneProps) {
  const [width, setWidth] = useState(leftWidth);
  const draggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const onDown = useCallback(() => {
    draggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    if (split !== "resizable") return;
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const next = Math.min(maxLeftWidth, Math.max(minLeftWidth, e.clientX - rect.left));
      setWidth(next);
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [split, minLeftWidth, maxLeftWidth]);

  return (
    <div ref={containerRef} style={ROOT_STYLE}>
      <div
        style={{
          width,
          flexShrink: 0,
          borderRight: "1px solid rgba(5, 5, 5, 0.06)",
          overflow: "auto",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {left}
      </div>
      {split === "resizable" && (
        <div
          role="separator"
          aria-orientation="vertical"
          tabIndex={0}
          onMouseDown={onDown}
          style={{
            width: 4,
            cursor: "col-resize",
            background: "transparent",
          }}
        />
      )}
      <div style={RIGHT_STYLE}>{right}</div>
    </div>
  );
}
