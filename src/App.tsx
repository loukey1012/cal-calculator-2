import { QueryClientProvider } from '@tanstack/react-query'
import { AppGate } from './AppGate'
import { AuthProvider } from './features/auth/AuthProvider'
import { createQueryClient } from './lib/queryClient'

const queryClient = createQueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppGate />
      </AuthProvider>
    </QueryClientProvider>
  )
}
