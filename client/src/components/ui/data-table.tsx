"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface DataTableColumn<T> {
  id: string
  header?: React.ReactNode
  cell?: (row: T) => React.ReactNode
  className?: string
}

export interface DataTableProps<T> {
  data: T[]
  columns: DataTableColumn<T>[]
  onRowClick?: (row: T) => void
  loading?: boolean
  pageSize?: number
  className?: string
}

export function DataTable<T>({
  data,
  columns,
  onRowClick,
  loading = false,
  pageSize = 10,
  className,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = React.useState(1)
  const totalPages = Math.ceil(data.length / pageSize)

  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return data.slice(start, start + pageSize)
  }, [data, currentPage, pageSize])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [data.length])

  if (loading) {
    return (
      <div className={cn("border rounded-md overflow-hidden", className)}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map((col) => (
                <TableHead key={col.id} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={col.id} className={col.className}>
                    <div className="h-4 w-full animate-pulse bg-muted rounded" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className={cn("border rounded-md overflow-hidden", className)}>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                No results found
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map((col) => (
                <TableHead key={col.id} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((row: any, i) => (
              <TableRow
                key={row.id || i}
                data-state={row.selected && "selected"}
                className={cn(onRowClick && "cursor-pointer")}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <TableCell key={col.id} className={col.className}>
                    {col.cell ? col.cell(row) : row[col.id]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-6 py-4">
          <div className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span>
            {" to "}
            <span className="font-medium">
              {Math.min(currentPage * pageSize, data.length)}
            </span>
            {" of "}
            <span className="font-medium">{data.length}</span>
            {" results"}
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
                />
              </PaginationItem>

              {(() => {
                const pages = []
                const maxVisible = 5

                if (totalPages <= maxVisible) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i)
                } else {
                  pages.push(1)
                  if (currentPage > 3) pages.push("...")

                  const start = Math.max(2, currentPage - 1)
                  const end = Math.min(totalPages - 1, currentPage + 1)

                  for (let i = start; i <= end; i++) {
                    if (!pages.includes(i)) pages.push(i)
                  }

                  if (currentPage < totalPages - 2) pages.push("...")
                  if (!pages.includes(totalPages)) pages.push(totalPages)
                }

                return pages.map((page, i) =>
                  page === "..." ? (
                    <PaginationItem key={`dots-${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(Number(page))}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )
              })()}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={cn(currentPage === totalPages && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}