import { Skeleton as AntSkeleton } from "antd";

export interface DetailSkeletonProps {
  tabs?: boolean;
  lines?: number;
}

export function DetailSkeleton({ tabs = false, lines = 5 }: DetailSkeletonProps) {
  return (
    <div role="progressbar" aria-label="Loading details" style={{ maxWidth: 600 }}>
      <AntSkeleton active paragraph={{ rows: 1, width: 220 }} title={{ width: 120 }} />
      {tabs && (
        <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
          <AntSkeleton.Button active size="default" style={{ width: 80 }} />
          <AntSkeleton.Button active size="default" style={{ width: 80 }} />
          <AntSkeleton.Button active size="default" style={{ width: 80 }} />
        </div>
      )}
      <div style={{ marginTop: 16 }}>
        <AntSkeleton active paragraph={{ rows: lines }} title={false} />
      </div>
    </div>
  );
}
