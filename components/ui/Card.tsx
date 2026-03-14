import styles from './Card.module.css'
import { cn } from '@/lib/utils'

type CardVariant = 'default' | 'surface' | 'surface2' | 'gradient'
type CardPadding = 'default' | 'sm' | 'lg' | 'none'

interface CardProps {
  children: React.ReactNode
  variant?: CardVariant
  padding?: CardPadding
  glow?: boolean
  className?: string
}

export default function Card({
  children,
  variant = 'default',
  padding = 'default',
  glow = false,
  className,
}: CardProps) {
  const classes = cn(
    styles.card,
    variant !== 'default' ? styles[variant] : undefined,
    padding === 'sm' ? styles['padding-sm'] : undefined,
    padding === 'lg' ? styles['padding-lg'] : undefined,
    padding === 'none' ? styles.noPadding : undefined,
    glow ? styles.glow : undefined,
    className
  )

  return <div className={classes}>{children}</div>
}
