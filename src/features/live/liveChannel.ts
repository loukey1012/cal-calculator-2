import { supabase } from '../../lib/supabase'

export type LiveChannelHandlers = {
  /** a raw message: parse it before use (see parseHint) */
  readonly onHint: (payload: unknown) => void
  /** connected, also again after a dropped connection came back */
  readonly onConnected: () => void
}

export type LiveChannel = {
  /** settles once the channel has left: only then can the same topic be joined again */
  readonly close: () => Promise<unknown>
}

/**
 * Listens on the household's private channel. Only its members may join (a policy on
 * realtime.messages); supabase-js signs in with the session and reconnects by itself.
 */
export function openLiveChannel(householdId: string, handlers: LiveChannelHandlers): LiveChannel {
  const channel = supabase.channel(`household:${householdId}`, { config: { private: true } })
  channel
    .on('broadcast', { event: 'change' }, (message) => handlers.onHint(message.payload))
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') handlers.onConnected()
    })
  return { close: () => supabase.removeChannel(channel) }
}
