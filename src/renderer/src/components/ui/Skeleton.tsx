'use client'
import React from 'react'

function Skeleton({ className = '' }: { className?: string }): React.ReactElement {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

export function TableRowSkeleton({ cols }: { cols: number }): React.ReactElement {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }): React.ReactElement {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} cols={cols} />
      ))}
    </>
  )
}

export function KPISkeleton(): React.ReactElement {
  return (
    <div className="bg-bg-card rounded-lg border border-border px-4 py-3 min-w-[160px] space-y-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-5 w-20" />
    </div>
  )
}

export function FormSkeleton({ rows = 6 }: { rows?: number }): React.ReactElement {
  return (
    <div className="space-y-5 p-6">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  )
}

export function PageLoadingSkeleton(): React.ReactElement {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3 text-text-secondary">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    </div>
  )
}

export default Skeleton
