import type { TestResult } from './pushDevice'

function phones(count: number): string {
  return count === 1 ? '1 phone' : `${count} phones`
}

/** e.g. "Sent to 2 phones." */
export function testResultText({ sent, failed }: TestResult): string {
  if (sent === 0 && failed === 0) return 'No phone of yours has notifications on.'
  const parts = [`Sent to ${phones(sent)}.`]
  if (failed > 0) parts.push(`${phones(failed)} couldn’t be reached.`)
  return parts.join(' ')
}
