import { dehydrate, QueryClient } from '@tanstack/react-query'
import { describe, expect, test } from 'vitest'
import { DEHYDRATE_OPTIONS } from './persistence'

describe('what is kept on the phone', () => {
  test('loaded data is kept, except queries marked not to persist', async () => {
    const client = new QueryClient()
    await client.fetchQuery({ queryKey: ['ingredients'], queryFn: () => ['Skyr'] })
    await client.fetchQuery({
      queryKey: ['openFoodFacts', '3017620422003'],
      queryFn: () => ({ kind: 'unavailable' }),
      meta: { persist: false },
    })

    const kept = dehydrate(client, DEHYDRATE_OPTIONS).queries.map((query) => query.queryKey)

    expect(kept).toEqual([['ingredients']])
  })
})
