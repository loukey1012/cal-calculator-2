export type StatTile = { readonly label: string; readonly value: string; readonly detail?: string }

/** Small figures under a chart, e.g. "Ø per day 1,920 kcal". */
export function StatTiles({ tiles }: { readonly tiles: readonly StatTile[] }) {
  return (
    <dl className="mt-3 grid grid-cols-3 gap-2" data-testid="trend-stats">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-2xl bg-bg-elevated px-3 py-2.5 shadow-card">
          <dt className="truncate text-[12px] font-semibold text-label-secondary">{tile.label}</dt>
          <dd className="mt-0.5 truncate text-[16px] font-bold">{tile.value}</dd>
          {tile.detail && (
            <dd className="truncate text-[12px] text-label-secondary">{tile.detail}</dd>
          )}
        </div>
      ))}
    </dl>
  )
}
