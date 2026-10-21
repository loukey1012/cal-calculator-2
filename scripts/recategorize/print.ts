// Prints the SQL that applies tree.json to a household's ingredients (see treeSql.ts):
//
//   node scripts/recategorize/print.ts <household-id> > tree.sql
//   pnpm exec supabase db query --linked -f tree.sql            (dev first, then production)
//
// It stops without changing anything when the tree and the ingredients don't match.
import { readFileSync } from 'node:fs'
import { treeSql, type CategoryTree } from './treeSql.ts'

const [householdId] = process.argv.slice(2)
if (!householdId) throw new Error('Usage: node scripts/recategorize/print.ts <household-id>')
const tree = JSON.parse(
  readFileSync(new URL('./tree.json', import.meta.url), 'utf8'),
) as CategoryTree
process.stdout.write(treeSql(tree, householdId))
