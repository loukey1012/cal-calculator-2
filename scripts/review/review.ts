// The ingredient review routine's only way into the database (see ROUTINE.md).
//
//   node scripts/review/review.ts fetch                 writes review-data.json
//   node scripts/review/review.ts submit findings.json  checks and sends the findings
//   node scripts/review/review.ts withdraw withdraw.json  withdraws open findings (a list of ids)
//
// Env: REVIEW_SUPABASE_URL, REVIEW_SUPABASE_ANON_KEY (the app's public key) and REVIEW_KEY (the
// household's review key). With these it can read the household's ingredients and the members'
// meals, add findings and withdraw open ones, nothing else (supabase/migrations/*_ingredient_review.sql and
// *_review_meals.sql, *_review_recheck.sql).
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { checkFindings, checkWithdrawals, reviewContext, type ReviewData } from './findings.ts'

const DATA_FILE = 'review-data.json'
// the household's days are Vienna days; the meal review looks at the last complete week
const TIME_ZONE = 'Europe/Vienna'
const REVIEWED_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

/** YYYY-MM-DD in the household's time zone, `daysAgo` days before now. */
function localDay(daysAgo: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(
    new Date(Date.now() - daysAgo * DAY_MS),
  )
}

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
  const ingredients = (await rpc('review_ingredients', {})) as Record<string, unknown[]>
  const from = localDay(REVIEWED_DAYS)
  const to = localDay(1)
  const meals = (await rpc('review_meals', { p_from: from, p_to: to })) as Record<string, unknown[]>
  writeFileSync(
    DATA_FILE,
    JSON.stringify({ ...ingredients, meals: { from, to, ...meals } }, null, 2),
  )
  console.log(
    `Wrote ${DATA_FILE}: ${ingredients.ingredients?.length ?? 0} ingredients, ` +
      `${meals.meals?.length ?? 0} meals from ${from} to ${to}`,
  )
}

async function submit(file: string): Promise<void> {
  const data = JSON.parse(readFileSync(DATA_FILE, 'utf8')) as ReviewData
  const findings = checkFindings(JSON.parse(readFileSync(file, 'utf8')), reviewContext(data))
  const runId = `review-${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8)}`
  const added = await rpc('submit_review_findings', { p_run_id: runId, p_findings: findings })
  console.log(`Run ${runId}: ${findings.length} findings sent, ${String(added)} new`)
}

async function withdraw(file: string): Promise<void> {
  const ids = checkWithdrawals(JSON.parse(readFileSync(file, 'utf8')))
  if (ids.length === 0) {
    console.log('Nothing to withdraw')
    return
  }
  const removed = await rpc('withdraw_review_findings', { p_ids: ids })
  console.log(`${ids.length} findings to withdraw, ${String(removed)} withdrawn`)
}

const [command, file] = process.argv.slice(2)
try {
  if (command === 'fetch') await fetchData()
  else if (command === 'submit' && file) await submit(file)
  else if (command === 'withdraw' && file) await withdraw(file)
  else {
    throw new Error(
      'Usage: review.ts fetch | review.ts submit <findings.json> | review.ts withdraw <ids.json>',
    )
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
