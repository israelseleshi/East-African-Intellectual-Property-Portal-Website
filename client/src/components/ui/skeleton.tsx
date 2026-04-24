import { cn } from "@/lib/utils"

interface BaseSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  count?: number;
  height?: string | number;
  width?: string | number;
}

function Skeleton({ className, count = 1, height, width }: BaseSkeletonProps) {
  if (count > 1) {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={cn("animate-pulse rounded-md bg-primary/10", className)}
            style={{ height, width }}
          />
        ))}
      </>
    );
  }
  return (
    <div
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      style={{ height, width }}
    />
  )
}

interface TableRowSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: number;
}

function TableRowSkeleton({ columns = 5, className }: TableRowSkeletonProps) {
  return (
    <div className={cn('flex items-center gap-4 p-4 border-b', className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-md bg-primary/10 h-4 flex-1" />
      ))}
    </div>
  );
}

function CardSkeleton({ className }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-6 space-y-4 bg-card rounded-xl border shadow-sm', className)}>
      <div className="flex justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-5" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-4 w-40" />
    </div>
  );
}

function StatCardSkeleton({ className }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-6 bg-card rounded-xl border shadow-sm', className)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
      <Skeleton className="h-9 w-32 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

function DetailPageSkeleton({ className }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    </div>
  );
}

function ListItemSkeleton({ className }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center gap-4 p-4 border-b', className)}>
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-6 w-16" />
    </div>
  );
}

function FormSkeleton({ className }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-6 p-6', className)}>
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

interface GridSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: number;
}

function GridSkeleton({ items = 6, className }: GridSkeletonProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

interface TableSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rows?: number;
  columns?: number;
}

function TableSkeleton({ rows = 5, columns = 5, className }: TableSkeletonProps) {
  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      <div className="border-b bg-muted/50 p-4">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-md bg-primary/10 h-4 flex-1" />
          ))}
        </div>
      </div>
      <div>
        {Array.from({ length: rows }).map((_, i) => (
          <TableRowSkeleton key={i} columns={columns} />
        ))}
      </div>
    </div>
  );
}

function CalendarSkeleton({ className }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('grid grid-cols-7 gap-2', className)}>
      {Array.from({ length: 35 }).map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-lg" />
      ))}
    </div>
  );
}

export { 
  Skeleton,
  TableRowSkeleton,
  CardSkeleton,
  StatCardSkeleton,
  DetailPageSkeleton,
  ListItemSkeleton,
  FormSkeleton,
  GridSkeleton,
  TableSkeleton,
  CalendarSkeleton
};

export type { BaseSkeletonProps, TableRowSkeletonProps, GridSkeletonProps, TableSkeletonProps };
