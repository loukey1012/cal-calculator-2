/** "1 category", "2 categories" */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}
