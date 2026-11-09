import { Skeleton as AntSkeleton, Table } from "antd";

export interface TableSkeletonProps {
  columns: number;
  rows?: number;
}

export function TableSkeleton({ columns, rows = 8 }: TableSkeletonProps) {
  const antColumns = Array.from({ length: columns }, (_, i) => ({
    key: `c-${i}`,
    title: <AntSkeleton.Input active size="small" style={{ width: 80 }} />,
    render: () => <AntSkeleton.Input active size="small" block />,
  }));
  const data = Array.from({ length: rows }, (_, r) => ({ key: r }));
  return (
    <div role="progressbar" aria-label="Loading table">
      <Table columns={antColumns} dataSource={data} pagination={false} size="small" />
    </div>
  );
}
