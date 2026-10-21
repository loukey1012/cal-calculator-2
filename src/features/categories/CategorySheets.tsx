import { useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { SelectRow } from '../../components/ios/FormRows'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { Sheet } from '../../components/ios/Sheet'
import { TextField } from '../../components/ios/TextField'
import type { Category, CategoryGroup } from '../ingredients/ingredientsApi'
import { categoryErrorMessage, parseCategoryName } from './categoryName'
import { plural } from './plural'
import { useDeleteCategory, useDeleteGroup, useSaveCategory, useSaveGroup } from './hooks'

const FORM_ID = 'category-form'

type NameSheetProps = {
  readonly title: string
  readonly initialName: string
  readonly saving: boolean
  readonly error: Error | null
  readonly onSave: (name: string) => void
  readonly onClose: () => void
  /** shown for an existing entry: confirms `question` before deleting */
  readonly deletion?: {
    readonly label: string
    readonly question: string
    /** why it can't be deleted yet (it isn't empty); shown instead of the button */
    readonly blockedBy?: string
    readonly deleting: boolean
    readonly onDelete: () => void
  }
  /** extra rows below the name, e.g. the broad category picker */
  readonly children?: ReactNode
}

/** A sheet that edits a name (validated like the database), with optional extra rows. */
function NameSheet({
  title,
  initialName,
  saving,
  error,
  onSave,
  onClose,
  deletion,
  children,
}: NameSheetProps) {
  const [name, setName] = useState(initialName)
  const [nameError, setNameError] = useState<string>()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = parseCategoryName(name)
    setNameError(result.success ? undefined : result.error)
    if (result.success) onSave(result.name)
  }

  function handleDelete() {
    if (deletion && window.confirm(deletion.question)) deletion.onDelete()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      action={
        <Button
          variant="plain"
          type="submit"
          form={FORM_ID}
          loading={saving}
          disabled={deletion?.deleting}
          className="-mr-2 font-semibold"
        >
          Save
        </Button>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={handleSubmit}>
        <GroupedSection>
          <TextField
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={nameError}
          />
          {children}
        </GroupedSection>
      </form>
      {error && <ErrorBanner message={categoryErrorMessage(error)} />}
      {deletion?.blockedBy && (
        <p className="mt-6 px-4 text-[13px] text-label-secondary">{deletion.blockedBy}</p>
      )}
      {deletion && !deletion.blockedBy && (
        <div className="mt-6">
          <Button
            variant="destructive"
            loading={deletion.deleting}
            disabled={saving}
            onClick={handleDelete}
          >
            {deletion.label}
          </Button>
        </div>
      )}
    </Sheet>
  )
}

type GroupSheetProps = {
  readonly householdId: string
  /** null adds a new broad category */
  readonly group: CategoryGroup | null
  readonly categoryCount: number
  readonly onClose: () => void
}

export function GroupSheet({ householdId, group, categoryCount, onClose }: GroupSheetProps) {
  const save = useSaveGroup(householdId)
  const remove = useDeleteGroup(householdId)
  return (
    <NameSheet
      title={group ? 'Edit Broad Category' : 'New Broad Category'}
      initialName={group?.name ?? ''}
      saving={save.isPending}
      error={save.error ?? remove.error}
      onSave={(name) => save.mutate({ id: group?.id ?? null, name }, { onSuccess: onClose })}
      onClose={onClose}
      deletion={
        group
          ? {
              label: 'Delete Broad Category',
              question: `Delete “${group.name}”?`,
              blockedBy:
                categoryCount > 0
                  ? `To delete it, first move or delete its ${plural(categoryCount, 'category', 'categories')}.`
                  : undefined,
              deleting: remove.isPending,
              onDelete: () => remove.mutate(group.id, { onSuccess: onClose }),
            }
          : undefined
      }
    />
  )
}

type CategorySheetProps = {
  readonly householdId: string
  /** null adds a new category */
  readonly category: Category | null
  readonly groups: readonly CategoryGroup[]
  readonly ingredientCount: number
  readonly onClose: () => void
}

export function CategorySheet({
  householdId,
  category,
  groups,
  ingredientCount,
  onClose,
}: CategorySheetProps) {
  const save = useSaveCategory(householdId)
  const remove = useDeleteCategory(householdId)
  // '' = not chosen yet
  const [groupId, setGroupId] = useState(category?.group_id ?? '')
  const [groupError, setGroupError] = useState<string>()

  function handleSave(name: string) {
    setGroupError(groupId === '' ? 'Choose a broad category' : undefined)
    if (groupId !== '')
      save.mutate({ id: category?.id ?? null, name, groupId }, { onSuccess: onClose })
  }

  return (
    <NameSheet
      title={category ? 'Edit Category' : 'New Category'}
      initialName={category?.name ?? ''}
      saving={save.isPending}
      error={save.error ?? remove.error}
      onSave={handleSave}
      onClose={onClose}
      deletion={
        category
          ? {
              label: 'Delete Category',
              question: `Delete “${category.name}”?`,
              blockedBy:
                ingredientCount > 0
                  ? `To delete it, first move its ${plural(ingredientCount, 'ingredient', 'ingredients')} to another category.`
                  : undefined,
              deleting: remove.isPending,
              onDelete: () => remove.mutate(category.id, { onSuccess: onClose }),
            }
          : undefined
      }
    >
      <SelectRow
        label="Broad category"
        value={groupId}
        onChange={(event) => setGroupId(event.target.value)}
        error={groupError}
      >
        <option value="" disabled>
          Choose
        </option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name}
          </option>
        ))}
      </SelectRow>
    </NameSheet>
  )
}
