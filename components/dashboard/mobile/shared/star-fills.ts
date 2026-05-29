/** Vul-percentage per ster (0..100) voor een waarde van 0..5. */
export function starFills(value: number, count = 5): number[] {
  return Array.from({ length: count }, (_, i) => {
    // Math.round dempt floating-point drift (0.8 * 100 = 79.999…) zodat het
    // resultaat per ster een heel percentage is.
    const fill = Math.max(0, Math.min(1, value - i)) * 100
    return Math.round(fill)
  })
}
