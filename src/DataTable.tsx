import { Empty, Table } from "antd";
import type { ColumnType, SortOrder } from "antd/es/table/interface";
import type { ReactNode } from "react";

export interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  editable?: boolean;
  renderEditor?: (row: T, commit: () => void, cancel: () => void) => ReactNode;
  width?: number | string;
  align?: "left" | "center" | "right";
}

export type SortDirection = "asc" | "desc";
export interface SortState {
  id: string;
  direction: SortDirection;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
  onPageChange: (next: number) => void;
  onPageSizeChange?: (next: number) => void;
}

export type SelectionMode = "none" | "single" | "multi";

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  rowKey: (row: T) => string;
  loading?: boolean;
  skeletonRows?: number;
  emptyState?: ReactNode;
  density?: "comfortable" | "compact";
  stickyHeader?: boolean;
  onRowClick?: (row: T) => void;

  sort?: SortState | null;
  onSortChange?: (next: SortState | null) => void;

  selection?: SelectionMode;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;

  pagination?: PaginationState;
}

export function DataTable<T>({
  data,
  columns,
  rowKey,
  loading = false,
  emptyState,
  density = "comfortable",
  stickyHeader = false,
  onRowClick,
  sort,
  onSortChange,
  selection = "none",
  selectedIds = [],
  onSelectionChange,
  pagination,
}: DataTableProps<T>) {
  const antColumns: ColumnType<T>[] = columns.map((col) => {
    let sortOrder: SortOrder | null | undefined;
    if (col.sortable) {
      sortOrder = sort?.id === col.id ? (sort.direction === "asc" ? "ascend" : "descend") : null;
    }
    return {
      key: col.id,
      title: col.header,
      align: col.align,
      width: col.width,
      sorter: col.sortable ? true : undefined,
      sortOrder,
      sortDirections: ["ascend", "descend"] as SortOrder[],
      showSorterTooltip: false,
      render: (_: unknown, row: T) => col.render(row),
    };
  });

  return (
    <Table<T>
      dataSource={data}
      columns={antColumns}
      rowKey={rowKey}
      loading={loading}
      size={density === "compact" ? "small" : "middle"}
      sticky={stickyHeader}
      bordered={false}
      onRow={
        onRowClick
          ? (row) => ({
              onClick: () => onRowClick(row),
              style: { cursor: "pointer" },
            })
          : undefined
      }
      rowSelection={
        selection === "none"
          ? undefined
          : {
              type: selection === "multi" ? "checkbox" : "radio",
              selectedRowKeys: selectedIds,
              onChange: (keys) => onSelectionChange?.(keys as string[]),
            }
      }
      onChange={(_pagination, _filters, sorter) => {
        if (!onSortChange) return;
        const s = Array.isArray(sorter) ? sorter[0] : sorter;
        if (!s || !s.columnKey || !s.order) {
          onSortChange(null);
          return;
        }
        onSortChange({ id: String(s.columnKey), direction: s.order === "ascend" ? "asc" : "desc" });
      }}
      pagination={
        pagination
          ? {
              current: pagination.page + 1,
              pageSize: pagination.pageSize,
              total: pagination.total,
              pageSizeOptions: pagination.pageSizeOptions?.map(String) ?? ["10", "25", "50", "100"],
              showSizeChanger: Boolean(pagination.onPageSizeChange),
              onChange: (page, size) => {
                if (size !== pagination.pageSize && pagination.onPageSizeChange) {
                  pagination.onPageSizeChange(size);
                }
                pagination.onPageChange(page - 1);
              },
            }
          : false
      }
      locale={{
        emptyText: emptyState ?? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No rows" />,
      }}
    />
  );
}
