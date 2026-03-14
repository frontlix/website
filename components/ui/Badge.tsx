import styles from './Badge.module.css'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'accent' | 'neutral'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  dot?: boolean
  className?: string
}

export default function Badge({
  children,
  variant = 'default',
  dot = false,
  className,
}: BadgeProps) {
  const classes = cn(
    styles.badge,
    styles[variant],
    dot ? styles.dot : undefined,
    className
  )

  return <span className={classes}>{children}</span>
}
