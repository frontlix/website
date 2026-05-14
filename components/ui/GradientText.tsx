import type { ElementType } from 'react'
import styles from './GradientText.module.css'
import { cn } from '@/lib/utils'

interface GradientTextProps {
  children: React.ReactNode
  as?: ElementType
  className?: string
}

export default function GradientText({
  children,
  as: Tag = 'span',
  className,
}: GradientTextProps) {
  return (
    <Tag className={cn(styles.gradientText, className)}>
      {children}
    </Tag>
  )
}
