"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The table shape settings needs eight times over — members, approval chains,
 * two integration logs, usage, top-ups, invoices and pronunciations. Written
 * once because eight hand-rolled grids would drift within a week, which is
 * exactly what happened to the accordions.
 *
 * Column-driven rather than children-driven so every table gets the same
 * header treatment, the same empty state and the same loading state without
 * each caller remembering to build them.
 */
export interface DataColumn<T> {
  key: string;
  header: ReactNode;
  /** Cell renderer. Return a node; alignment and truncation are yours. */
  cell: (row: T) => ReactNode;
  /** Right-align numerics. Applies tabular-nums too. */
  numeric?: boolean;
  /** Hidden below sm — for columns that are nice rather than necessary. */
  secondary?: boolean;
  width?: string;
}

export interface DataTableProps<T> {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Makes rows clickable. */
  onRowClick?: (row: T) => void;
  /** Shown in place of rows when there are none. */
  empty?: ReactNode;
  loading?: boolean;
  loadingRows?: number;
  className?: string;
}

export function DataTable<T>({
  columns, rows, rowKey, onRowClick, empty, loading, loadingRows = 4, className,
}: DataTableProps<T>) {
  return (
    // The scroller is the wrapper, not the page: a wide table must never make
    // the body scroll sideways.
    <div className={cn("overflow-x-auto rounded-panel border border-hair bg-card", className)}>
      <table className="w-full border-collapse text-body">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                style={c.width ? { width: c.width } : undefined}
                className={cn(
                  "whitespace-nowrap border-b border-hair bg-subtle px-4 py-2.5 text-left",
                  "text-caption font-bold uppercase tracking-wider text-ink-3",
                  c.numeric && "text-right",
                  c.secondary && "hidden sm:table-cell",
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: loadingRows }, (_, i) => (
              <tr key={`skeleton-${i}`} aria-hidden>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "border-b border-hair px-4 py-3",
                      c.secondary && "hidden sm:table-cell",
                    )}
                  >
                    <div className="shimmer h-3.5 w-full rounded-glyph bg-black/[0.06]" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-body text-ink-3">
                {empty ?? "Nothing here yet."}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-hair last:border-b-0",
                  onRowClick && "cursor-pointer transition-colors hover:bg-subtle",
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-4 py-3 align-middle text-ink-2",
                      c.numeric && "text-right tabular-nums",
                      c.secondary && "hidden sm:table-cell",
                    )}
                  >
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
