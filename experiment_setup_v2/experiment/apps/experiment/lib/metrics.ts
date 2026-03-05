/**
 * Levenshtein distance between two strings.
 * Used to measure how much a participant edited the generated lesson text.
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }
  return dp[m][n]
}

/**
 * Count how many of the N known errors were corrected.
 * An error is "corrected" if the errorText no longer appears in the finalText
 * and the correctText does appear.
 */
export function countCorrectedErrors(
  finalText: string,
  errors: { id: string; errorText: string; correctText: string }[]
): { corrected: string[]; uncorrected: string[] } {
  const corrected: string[] = []
  const uncorrected: string[] = []
  for (const error of errors) {
    const hasError = finalText.includes(error.errorText)
    const hasCorrection = finalText.includes(error.correctText)
    if (!hasError && hasCorrection) {
      corrected.push(error.id)
    } else {
      uncorrected.push(error.id)
    }
  }
  return { corrected, uncorrected }
}
