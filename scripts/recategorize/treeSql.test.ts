import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { treeSql, type CategoryTree } from './treeSql'

const HOUSEHOLD = '0b8f7c1e-2d3a-4b5c-8d9e-0f1a2b3c4d5e'

describe('treeSql', () => {
  test('carries the tree as JSON, with quotes doubled for the SQL string', () => {
    const tree: CategoryTree = {
      'Cooking & Sauces': { Sauces: ["Real Light Mayonnaise (Hellmann's)"] },
    }

    const sql = treeSql(tree, HOUSEHOLD)

    expect(sql).toContain(`h uuid := '${HOUSEHOLD}';`)
    expect(sql).toContain(`"Real Light Mayonnaise (Hellmann''s)"`)
    expect(sql).not.toContain("Hellmann's")
  })

  test('refuses anything but a household id', () => {
    expect(() => treeSql({}, "x'; drop table households; --")).toThrow('Not a household id')
  })

  test('the tree has a category only once and every product only once', () => {
    // from the repository root, where the tests run
    const tree = JSON.parse(readFileSync('scripts/recategorize/tree.json', 'utf8')) as CategoryTree
    const categories = Object.values(tree).flatMap((broad) => Object.keys(broad))
    const products = Object.values(tree).flatMap((broad) => Object.values(broad).flat())

    expect(new Set(categories.map((name) => name.toLowerCase())).size).toBe(categories.length)
    expect(new Set(products).size).toBe(products.length)
  })
})
