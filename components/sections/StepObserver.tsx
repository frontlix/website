'use client'

import { useEffect, useRef, useState } from 'react'

interface StepObserverProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  activeClassName?: string
}

/**
 * Adds an active class when the step's center area is in the viewport.
 * Negative rootMargin shrinks the observation zone so it triggers
 * when the element is ~30% into the viewport from top or bottom.
 */
export default function StepObserver({
  children,
  className,
  style,
  activeClassName,
}: StepObserverProps) {
  const ref = useRef<HTMLElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting)
      },
      {
        /* Shrink the observation zone: triggers when element is
           ~150px inside the viewport from top/bottom */
        rootMargin: '-150px 0px -150px 0px',
        threshold: 0,
      }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <article
      ref={ref}
      className={`${className || ''} ${inView && activeClassName ? activeClassName : ''}`}
      style={style}
    >
      {children}
    </article>
  )
}
