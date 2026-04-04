import * as React from 'react'
import { cn } from '@/lib/utils'
import { BUCKET_COLORS } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  bucket?: string
}

export function Badge({ className, bucket, children, ...props }: BadgeProps) {
  const color = bucket ? BUCKET_COLORS[bucket] : undefined
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        className,
      )}
      style={color ? { background: `${color}18`, color } : undefined}
      {...props}
    >
      {children}
    </span>
  )
}
