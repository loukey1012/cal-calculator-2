import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { BrowserRouter } from 'react-router'
import { AppGate } from './AppGate'
import { AuthProvider } from './features/auth/AuthProvider'
import { registerDishChangeDefaults } from './features/dishes/dishChanges'
import { registerDayChangeDefaults } from './features/meals/dayChanges'
import { registerWeightChangeDefaults } from './features/weight/weightChanges'
import { startOnlineTracking } from './lib/online'
import { CACHE_BUSTER, DEHYDRATE_OPTIONS, persister } from './lib/persistence'
import { CACHE_MAX_AGE_MS, createQueryClient } from './lib/queryClient'

startOnlineTracking()
const queryClient = createQueryClient()
registerDayChangeDefaults(queryClient)
registerDishChangeDefaults(queryClient)
registerWeightChangeDefaults(queryClient)

const persistOptions = {
  persister,
  maxAge: CACHE_MAX_AGE_MS,
  buster: CACHE_BUSTER,
  dehydrateOptions: DEHYDRATE_OPTIONS,
}

export default function App() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <BrowserRouter>
        <AuthProvider>
          <AppGate />
        </AuthProvider>
      </BrowserRouter>
    </PersistQueryClientProvider>
  )
}
