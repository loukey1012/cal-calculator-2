// The ingredient review routine's only way into the database (see ROUTINE.md).
//
//   node scripts/review/review.ts fetch                 writes review-data.json
//   node scripts/review/review.ts submit findings.json  checks and sends the findings
//
// Env: REVIEW_SUPABASE_URL, REVIEW_SUPABASE_ANON_KEY (the app's public key) and REVIEW_KEY (the
// household's review key). With these it can read the household's ingredients and add findings,
// nothing else (supabase/migrations/*_ingredient_review.sql).
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { checkFindings } from './findings.ts'

const DATA_FILE = 'review-data.json'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name}: set it in the routine's environment`)
  return value
}

async function rpc(name: string, args: Record<string, unknown>): Promise<unknown> {
  const url = requireEnv('REVIEW_SUPABASE_URL')
  const anonKey = requireEnv('REVIEW_SUPABASE_ANON_KEY')
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_key: requireEnv('REVIEW_KEY'), ...args }),
  })
  const text = await response.text()
  // e.g. a gateway's HTML error page: report the status, not a parse error
  if (!response.ok) throw new Error(`${name} failed (${response.status}): ${text.slice(0, 500)}`)
  return JSON.parse(text) as unknown
}

async function fetchData(): Promise<void> {
  const data = (await rpc('review_ingredients', {})) as { ingredients: unknown[] }
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
  console.log(`Wrote ${DATA_FILE}: ${data.ingredients.length} ingredients`)
}

async function submit(file: string): Promise<void> {
  const data = JSON.parse(readFileSync(DATA_FILE, 'utf8')) as {
    ingredients: Array<{ id: string }>
  }
  const findings = checkFindings(
    JSON.parse(readFileSync(file, 'utf8')),
    new Set(data.ingredients.map(({ id }) => id)),
  )
  const runId = `review-${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8)}`
  const added = await rpc('submit_ingredient_findings', { p_run_id: runId, p_findings: findings })
  console.log(`Run ${runId}: ${findings.length} findings sent, ${String(added)} new`)
}

const [command, file] = process.argv.slice(2)
try {
  if (command === 'fetch') await fetchData()
  else if (command === 'submit' && file) await submit(file)
  else throw new Error('Usage: review.ts fetch | review.ts submit <findings.json>')
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
