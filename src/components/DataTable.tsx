import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T, index: number) => React.ReactNode;
  align?: "left" | "right";
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string | number;
  emptyState?: React.ReactNode;
}

export function DataTable<T>({ columns, data, rowKey, emptyState }: DataTableProps<T>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.key} className={col.align === "right" ? "text-right" : undefined}>
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="py-6 text-center text-muted-foreground">
              {emptyState ?? "데이터가 없습니다"}
            </TableCell>
          </TableRow>
        ) : (
          data.map((row, index) => (
            <TableRow key={rowKey(row, index)}>
              {columns.map((col) => (
                <TableCell key={col.key} className={col.align === "right" ? "text-right" : undefined}>
                  {col.cell(row, index)}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
