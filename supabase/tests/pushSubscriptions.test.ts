import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { admin, anonClient, createTestUser, deleteTestUsers, type TestUser } from './helpers'

// Alice and Bob share a household (and, in one test, a phone).
let alice: TestUser
let bob: TestUser

const endpoint = () => `https://push.example.com/send/${crypto.randomUUID()}`

function subscribe(user: TestUser, url: string) {
  return user.client.rpc('save_push_subscription', {
    p_endpoint: url,
    p_p256dh: 'BPublicKeyOfThePhone',
    p_auth: 'authSecret',
    p_device_label: 'iPhone',
  })
}

beforeAll(async () => {
  alice = await createTestUser('alice')
  bob = await createTestUser('bob')
  const household = await alice.client.rpc('create_household', { p_name: 'Pushers' })
  if (household.error) throw new Error(household.error.message)
  const joined = await bob.client.rpc('join_household', {
    p_invite_code: household.data.invite_code,
  })
  if (joined.error) throw new Error(joined.error.message)
})

afterAll(async () => {
  await deleteTestUsers([alice, bob].filter(Boolean))
})

describe('push subscriptions', () => {
  test('a phone is saved for me; I see it, without its keys', async () => {
    // Arrange
    const url = endpoint()

    // Act
    const { error } = await subscribe(alice, url)

    // Assert
    expect(error).toBeNull()
    const mine = await alice.client
      .from('push_subscriptions')
      .select('user_id, endpoint, device_label')
      .eq('endpoint', url)
    expect(mine.data).toEqual([{ user_id: alice.id, endpoint: url, device_label: 'iPhone' }])
    const keys = await alice.client.from('push_subscriptions').select('p256dh, auth')
    expect(keys.error).not.toBeNull()
  })

  test("the partner doesn't see my phones", async () => {
    const url = endpoint()
    await subscribe(alice, url)

    const { data } = await bob.client.from('push_subscriptions').select('id').eq('endpoint', url)

    expect(data).toEqual([])
  })

  test('signing in as someone else on the same phone takes it over', async () => {
    // Arrange
    const url = endpoint()
    await subscribe(alice, url)

    // Act
    const { error } = await subscribe(bob, url)

    // Assert
    expect(error).toBeNull()
    const { data } = await admin.from('push_subscriptions').select('user_id').eq('endpoint', url)
    expect(data).toEqual([{ user_id: bob.id }])
  })

  test('only my own phone can be forgotten', async () => {
    // Arrange
    const url = endpoint()
    await subscribe(alice, url)

    // Act
    await bob.client.rpc('delete_push_subscription', { p_endpoint: url })
    const stillThere = await admin.from('push_subscriptions').select('id').eq('endpoint', url)
    await alice.client.rpc('delete_push_subscription', { p_endpoint: url })
    const gone = await admin.from('push_subscriptions').select('id').eq('endpoint', url)

    // Assert
    expect(stillThere.data).toHaveLength(1)
    expect(gone.data).toEqual([])
  })

  test('only https push addresses; nobody writes the table directly or signed out', async () => {
    const plain = await subscribe(alice, 'http://push.example.com/x')
    const direct = await alice.client
      .from('push_subscriptions')
      .insert({ endpoint: endpoint(), p256dh: 'x', auth: 'y' })
    const signedOut = await anonClient().rpc('save_push_subscription', {
      p_endpoint: endpoint(),
      p_p256dh: 'x',
      p_auth: 'y',
    })

    expect(plain.error?.code).toBe('23514')
    expect(direct.error).not.toBeNull()
    expect(signedOut.error).not.toBeNull()
  })
})
