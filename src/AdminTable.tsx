import { Table } from "antd";
import type { ColumnType } from "antd/es/table/interface";
import type { ReactNode } from "react";

export interface AdminTableColumn<T> {
  key: string;
  label?: ReactNode;
  align?: "left" | "center" | "right";
  width?: number | string;
  render: (row: T) => ReactNode;
}

export interface AdminTableProps<T> {
  columns: AdminTableColumn<T>[];
  rows: T[];
  rowKey: keyof T;
  loading?: boolean;
  empty: ReactNode;
  onRowClick?: (row: T) => void;
  footer?: ReactNode;
  skeletonRows?: number;
}

export function AdminTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  empty,
  onRowClick,
  footer,
}: AdminTableProps<T>) {
  const antColumns: ColumnType<T>[] = columns.map((c) => ({
    key: c.key,
    title: c.label,
    align: c.align,
    width: c.width,
    render: (_: unknown, row: T) => c.render(row),
  }));

  return (
    <Table<T>
      columns={antColumns}
      dataSource={rows}
      rowKey={(row) => String(row[rowKey])}
      loading={loading}
      size="small"
      pagination={false}
      onRow={
        onRowClick
          ? (row) => ({ onClick: () => onRowClick(row), style: { cursor: "pointer" } })
          : undefined
      }
      footer={footer ? () => footer : undefined}
      locale={{ emptyText: empty }}
    />
  );
}
