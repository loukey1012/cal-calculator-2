export function ErrorBanner({ message }: { readonly message: string }) {
  return (
    <p
      role="alert"
      className="mt-4 rounded-2xl bg-destructive/10 px-4 py-3 text-[15px] text-destructive"
    >
      {message}
    </p>
  )
}
