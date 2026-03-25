'use client'

import { useEffect, useRef, useState, createContext, useContext } from 'react'

/* ---- Context: parent tracks which step index is active ---- */
const ActiveStepContext = createContext<number>(0)

interface TimelineProviderProps {
  children: React.ReactNode
  totalSteps: number
}

/**
 * Wraps the entire timeline. Observes each registered step element
 * and activates the next step only when the previous one leaves the viewport.
 */
export function TimelineProvider({ children, totalSteps }: TimelineProviderProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const stepsRef = useRef<Map<number, HTMLElement>>(new Map())

  const registerStep = (index: number, el: HTMLElement | null) => {
    if (el) {
      stepsRef.current.set(index, el)
    } else {
      stepsRef.current.delete(index)
    }
  }

  useEffect(() => {
    const observers: IntersectionObserver[] = []

    for (let i = 0; i < totalSteps; i++) {
      const el = stepsRef.current.get(i)
      if (!el) continue

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveIndex(i)
          }
        },
        {
          /* Element triggers when its top crosses ~40% from the top of the viewport */
          rootMargin: '-40% 0px -55% 0px',
          threshold: 0,
        }
      )

      observer.observe(el)
      observers.push(observer)
    }

    return () => observers.forEach((o) => o.disconnect())
  }, [totalSteps])

  return (
    <ActiveStepContext.Provider value={activeIndex}>
      <TimelineRegisterContext.Provider value={registerStep}>
        {children}
      </TimelineRegisterContext.Provider>
    </ActiveStepContext.Provider>
  )
}

/* ---- Register context so children can register themselves ---- */
const TimelineRegisterContext = createContext<
  (index: number, el: HTMLElement | null) => void
>(() => {})

/* ---- Individual step wrapper ---- */
interface StepObserverProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  activeClassName?: string
  index: number
}

export default function StepObserver({
  children,
  className,
  style,
  activeClassName,
  index,
}: StepObserverProps) {
  const ref = useRef<HTMLElement>(null)
  const register = useContext(TimelineRegisterContext)
  const activeIndex = useContext(ActiveStepContext)
  const isActive = activeIndex === index

  useEffect(() => {
    register(index, ref.current)
    return () => register(index, null)
  }, [index, register])

  return (
    <article
      ref={ref}
      className={`${className || ''} ${isActive && activeClassName ? activeClassName : ''}`}
      style={style}
    >
      {children}
    </article>
  )
}
