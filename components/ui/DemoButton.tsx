'use client'

import { useState } from 'react'
import Button from './Button'
import DemoModal from './DemoModal'

interface DemoButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function DemoButton({
  children,
  variant = 'primary',
  size = 'md',
  className,
}: DemoButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        {children}
      </Button>
      <DemoModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}
