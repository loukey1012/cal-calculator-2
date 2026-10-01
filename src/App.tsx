import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router'
import { AppGate } from './AppGate'
import { AuthProvider } from './features/auth/AuthProvider'
import { createQueryClient } from './lib/queryClient'

const queryClient = createQueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppGate />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
