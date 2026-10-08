import { PersonBadge } from './PersonBadge'
import type { PersonLook } from './partnerLook'

type LookPreviewProps = { readonly look: PersonLook; readonly testId: string }

/** A person as the person switch shows them: badge and name. */
export function LookPreview({ look, testId }: LookPreviewProps) {
  return (
    <div className="mt-4 flex justify-center">
      <span
        data-testid={testId}
        className="flex h-14 items-center gap-3 rounded-full bg-bg-elevated pr-6 pl-2 text-[19px] font-bold shadow-card"
      >
        <PersonBadge look={look} size="large" />
        {look.name}
      </span>
    </div>
  )
}
