'use client'
import { useEffect, useState } from 'react'
import { parseNl, toCommaStr } from '@/lib/dashboard/number-nl'

type Props = {
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  className?: string
  placeholder?: string
  ariaLabel?: string
}

/**
 * Tekst-input voor een NL-decimaalgetal: accepteert een komma (24,3). Houdt
 * tijdens het typen een tekststaat vast zodat de komma niet wordt weggeklokt;
 * commit (parsen + clampen) gebeurt op blur. Lege/ongeldige invoer → 0.
 */
export function NlNumberInput({ value, onChange, min, max, className, placeholder, ariaLabel }: Props) {
  const [focused, setFocused] = useState(false)
  const [text, setText] = useState(value ? toCommaStr(value) : '')

  useEffect(() => {
    if (!focused) setText(value ? toCommaStr(value) : '')
  }, [value, focused])

  const commit = () => {
    setFocused(false)
    let v = parseNl(text)
    if (Number.isNaN(v)) v = 0
    if (min != null) v = Math.max(min, v)
    if (max != null) v = Math.min(max, v)
    onChange(v)
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      placeholder={placeholder}
      aria-label={ariaLabel}
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
    />
  )
}
