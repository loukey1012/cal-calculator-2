import { useState, type FormEvent } from 'react'
import { z } from 'zod'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { Sheet } from '../../components/ios/Sheet'
import { TextField } from '../../components/ios/TextField'
import { toUserMessage } from '../../lib/errors'
import { useNavigate } from 'react-router'
import { displayName, useUpdateProfile } from '../household/hooks'
import type { Profile } from '../household/householdApi'
import { OWN_LOOK_PATH } from '../household/OwnLookPage'
import { SYMBOLS } from '../household/partnerLook'
import { PersonBadge } from '../household/PersonBadge'
import { useLookOf } from '../household/usePersonLook'

const NAME_FORM_ID = 'name-form'
const MAX_NAME = 40

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Enter your name')
  .max(MAX_NAME, `Use at most ${MAX_NAME} characters`)

/** Your name and your symbol; only you can change them. Colors live in Settings › Appearance. */
export function AccountSection({ profile }: { readonly profile: Profile }) {
  const update = useUpdateProfile(profile.id)
  const [editingName, setEditingName] = useState(false)
  const navigate = useNavigate()
  const look = useLookOf()(profile)
  const symbol = look.badge.kind === 'symbol' ? look.badge.symbol : null

  return (
    <>
      <GroupedSection header="Account">
        <ListRow title="Name" detail={displayName(profile)} onClick={() => setEditingName(true)} />
        <ListRow
          leading={<PersonBadge look={look} size="large" />}
          title="Symbol"
          detail={SYMBOLS.find(({ value }) => value === symbol)?.name ?? 'Initial'}
          onClick={() => navigate(OWN_LOOK_PATH, { replace: true })}
        />
      </GroupedSection>
      {update.isError && !editingName && <ErrorBanner message={toUserMessage(update.error)} />}
      <Sheet
        open={editingName}
        onClose={() => setEditingName(false)}
        title="Name"
        action={
          <Button
            variant="plain"
            type="submit"
            form={NAME_FORM_ID}
            loading={update.isPending}
            className="-mr-2 font-semibold"
          >
            Save
          </Button>
        }
      >
        <NameForm
          initialName={profile.display_name}
          onSubmit={(name) =>
            update.mutate({ display_name: name }, { onSuccess: () => setEditingName(false) })
          }
        />
        {update.isError && <ErrorBanner message={toUserMessage(update.error)} />}
      </Sheet>
    </>
  )
}

type NameFormProps = { readonly initialName: string; readonly onSubmit: (name: string) => void }

function NameForm({ initialName, onSubmit }: NameFormProps) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | undefined>()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = nameSchema.safeParse(name)
    setError(parsed.error?.issues[0]?.message)
    if (parsed.success) onSubmit(parsed.data)
  }

  return (
    <form id={NAME_FORM_ID} noValidate onSubmit={handleSubmit}>
      <GroupedSection footer="Shown to your household, e.g. in the person switch.">
        <TextField
          label="Your name"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={error}
        />
      </GroupedSection>
    </form>
  )
}
