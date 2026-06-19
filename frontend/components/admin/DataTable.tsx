"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T extends { id: number }> {
  data: T[];
  columns: DataTableColumn<T>[];
  onDelete?: (ids: number[]) => void;
  searchable?: boolean;
  searchKeys?: (keyof T)[];
}

export function DataTable<T extends { id: number }>({
  data,
  columns,
  onDelete,
  searchable,
  searchKeys = [],
}: DataTableProps<T>) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      searchKeys.some((k) => String(row[k] ?? "").toLowerCase().includes(q))
    );
  }, [data, search, searchKeys]);

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.id)));
  };

  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {searchable && (
          <Input
            placeholder="Tìm kiếm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        )}
        {onDelete && selected.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              onDelete([...selected]);
              setSelected(new Set());
            }}
          >
            <Trash2 className="h-4 w-4" /> Xóa ({selected.size})
          </Button>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {onDelete && (
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={toggleAll}
                />
              </TableHead>
            )}
            {columns.map((c) => (
              <TableHead key={c.key}>{c.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + (onDelete ? 1 : 0)} className="text-center text-muted-foreground">
                Không có dữ liệu
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((row) => (
              <TableRow key={row.id}>
                {onDelete && (
                  <TableCell>
                    <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggle(row.id)} />
                  </TableCell>
                )}
                {columns.map((c) => (
                  <TableCell key={c.key}>
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
