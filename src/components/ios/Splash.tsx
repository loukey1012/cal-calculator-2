export function Splash() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="flex min-h-dvh items-center justify-center bg-bg"
    >
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-label-secondary border-t-transparent" />
    </div>
  )
}
