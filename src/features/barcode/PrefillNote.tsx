/** Where a new ingredient's values came from, above its form. */
export function PrefillNote({ text }: { readonly text: string }) {
  return (
    <p
      role="status"
      className="mb-3 rounded-2xl bg-accent-soft px-4 py-3 text-[14px] font-semibold text-accent-ink"
    >
      {text}
    </p>
  )
}
