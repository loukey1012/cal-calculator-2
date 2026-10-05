// One-off import of the old Firebase `foods` collection into a household's ingredients.
//
//   node scripts/migrate-firebase/migrate.ts --household <uuid>            dry run (report only)
//   node scripts/migrate-firebase/migrate.ts --household <uuid> --apply    import
//
// Env: MIGRATION_SUPABASE_URL, MIGRATION_SUPABASE_SERVICE_ROLE_KEY,
//      FIREBASE_SERVICE_ACCOUNT (default: secrets/firebase-service-account.json)
//
// Known source-data errors are fixed on the way in (corrections.ts).
// Firebase is only read. Re-running is safe: ingredients are upserted on (household_id, legacy_id).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import type { Database } from '../../src/lib/database.types.ts'
import { applyCorrections, CORRECTIONS, type AppliedChange } from './corrections.ts'
import {
  distinctCategories,
  transformFoods,
  type ImportedIngredient,
  type TransformResult,
} from './transform.ts'

const COLLECTION = 'foods'
const BATCH_SIZE = 100
const SAMPLE_SIZE = 3
const DEFAULT_SERVICE_ACCOUNT = 'secrets/firebase-service-account.json'

type Admin = SupabaseClient<Database>

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable ${name}`)
  return value
}

async function readFoods(serviceAccountPath: string) {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
  initializeApp({ credential: cert(serviceAccount) })
  // read-only: a single query, nothing in Firebase is written
  const snapshot = await getFirestore().collection(COLLECTION).get()
  return snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }))
}

async function existingCategories(admin: Admin, householdId: string) {
  const { data, error } = await admin
    .from('categories')
    .select('id, name')
    .eq('household_id', householdId)
  if (error) throw new Error(`Reading categories failed: ${error.message}`)
  return data
}

/** Applies the known source-data fixes; categories are derived afterwards so merged ones vanish. */
function corrected(transformed: TransformResult) {
  const { ingredients, applied, unmatched } = applyCorrections(transformed.ingredients, CORRECTIONS)
  if (unmatched.length > 0) {
    throw new Error(`Corrections for foods that were not imported: ${unmatched.join(', ')}`)
  }
  const result: TransformResult = {
    ...transformed,
    ingredients,
    categories: distinctCategories(ingredients),
  }
  return { result, applied }
}

function reportCorrections(applied: readonly AppliedChange[]) {
  console.log(`Corrections:         ${applied.length}`)
  for (const change of applied) {
    console.log(
      `  - "${change.name}" ${change.field}: ${JSON.stringify(change.from)} -> ${JSON.stringify(change.to)}`,
    )
  }
}

function report(foodCount: number, result: TransformResult, knownCategories: readonly string[]) {
  const known = new Set(knownCategories.map((name) => name.toLowerCase()))
  const newCategories = result.categories.filter((name) => !known.has(name.toLowerCase()))
  console.log(`Firebase foods:      ${foodCount}`)
  console.log(`Importable:          ${result.ingredients.length}`)
  console.log(`Skipped:             ${result.skipped.length}`)
  for (const food of result.skipped) console.log(`  - "${food.name}" (${food.id}): ${food.reason}`)
  console.log(`Categories:          ${result.categories.join(', ') || '(none)'}`)
  console.log(`  to create:         ${newCategories.join(', ') || '(none)'}`)
  console.log('Examples:')
  for (const sample of result.ingredients.slice(0, SAMPLE_SIZE))
    console.log(' ', JSON.stringify(sample))
}

async function createMissingCategories(
  admin: Admin,
  householdId: string,
  names: readonly string[],
): Promise<Map<string, string>> {
  const existing = await existingCategories(admin, householdId)
  const known = new Set(existing.map((category) => category.name.toLowerCase()))
  const missing = names.filter((name) => !known.has(name.toLowerCase()))
  const created =
    missing.length === 0
      ? []
      : await admin
          .from('categories')
          .insert(missing.map((name) => ({ household_id: householdId, name })))
          .select('id, name')
          .then(({ data, error }) => {
            if (error) throw new Error(`Creating categories failed: ${error.message}`)
            return data
          })
  return new Map(
    [...existing, ...created].map((category) => [category.name.toLowerCase(), category.id]),
  )
}

function toRow(householdId: string, categoryIds: Map<string, string>, item: ImportedIngredient) {
  const { categoryName, created_at: createdAt, ...columns } = item
  return {
    ...columns,
    household_id: householdId,
    category_id:
      categoryName === null ? null : (categoryIds.get(categoryName.toLowerCase()) ?? null),
    // keep the original date when Firebase had one; otherwise the column default (now)
    ...(createdAt === null ? {} : { created_at: createdAt }),
  }
}

async function importIngredients(admin: Admin, householdId: string, result: TransformResult) {
  const categoryIds = await createMissingCategories(admin, householdId, result.categories)
  const rows = result.ingredients.map((item) => toRow(householdId, categoryIds, item))
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const { error } = await admin
      .from('ingredients')
      .upsert(rows.slice(start, start + BATCH_SIZE), {
        onConflict: 'household_id,legacy_id',
        defaultToNull: false,
      })
    if (error) throw new Error(`Importing ingredients failed: ${error.message}`)
  }
  const { count, error } = await admin
    .from('ingredients')
    .select('id', { count: 'exact', head: true })
    .eq('household_id', householdId)
    .not('legacy_id', 'is', null)
  if (error) throw new Error(`Verifying the import failed: ${error.message}`)
  console.log(`Imported. Ingredients from Firebase now in the household: ${count}`)
}

async function main() {
  const { values } = parseArgs({
    options: { household: { type: 'string' }, apply: { type: 'boolean', default: false } },
  })
  if (!values.household) throw new Error('Pass --household <uuid>')
  const admin = createClient<Database>(
    requireEnv('MIGRATION_SUPABASE_URL'),
    requireEnv('MIGRATION_SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } },
  )

  const { data: household, error } = await admin
    .from('households')
    .select('id, name')
    .eq('id', values.household)
    .maybeSingle()
  if (error) throw new Error(`Reading the household failed: ${error.message}`)
  if (!household) throw new Error(`Household ${values.household} not found`)
  console.log(`Target household:    ${household.name} (${household.id})`)

  const foods = await readFoods(process.env.FIREBASE_SERVICE_ACCOUNT ?? DEFAULT_SERVICE_ACCOUNT)
  const { result, applied } = corrected(transformFoods(foods))
  const known = await existingCategories(admin, household.id)
  report(
    foods.length,
    result,
    known.map((category) => category.name),
  )
  reportCorrections(applied)

  if (!values.apply) {
    console.log('\nDry run only. Re-run with --apply to import.')
    return
  }
  await importIngredients(admin, household.id, result)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
