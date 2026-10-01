import { useMutation } from '@tanstack/react-query'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { Screen } from '../../components/ios/Screen'
import { SegmentedControl } from '../../components/ios/SegmentedControl'
import { TextField } from '../../components/ios/TextField'
import { toUserMessage } from '../../lib/errors'
import { fieldErrors, type FieldErrors } from '../../lib/forms'
import { signIn, signUp } from './authApi'
import { loginSchema, signUpSchema, type LoginInput, type SignUpInput } from './validation'

type Mode = 'login' | 'signup'
type FormValues = {
  readonly displayName: string
  readonly email: string
  readonly password: string
}

const MODE_OPTIONS = [
  { value: 'login', label: 'Log in' },
  { value: 'signup', label: 'Sign up' },
] as const

const CONFIRM_EMAIL_NOTICE = 'Account created. Check your inbox to confirm your email, then log in.'
const EMPTY_VALUES: FormValues = { displayName: '', email: '', password: '' }

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login')
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [notice, setNotice] = useState<string | null>(null)

  const signInMutation = useMutation({ mutationFn: (input: LoginInput) => signIn(input) })
  const signUpMutation = useMutation({
    mutationFn: (input: SignUpInput) => signUp(input),
    onSuccess: ({ needsEmailConfirmation }) => {
      // without confirmation the new session arrives via AuthProvider instead
      if (!needsEmailConfirmation) return
      setNotice(CONFIRM_EMAIL_NOTICE)
      setMode('login')
      setValues((current) => ({ ...current, password: '' }))
    },
  })
  const activeMutation = mode === 'login' ? signInMutation : signUpMutation

  const update = (field: keyof FormValues) => (event: ChangeEvent<HTMLInputElement>) =>
    setValues((current) => ({ ...current, [field]: event.target.value }))

  function changeMode(next: Mode) {
    setMode(next)
    setErrors({})
    setNotice(null)
    signInMutation.reset()
    signUpMutation.reset()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)
    if (mode === 'login') {
      const parsed = loginSchema.safeParse(values)
      setErrors(fieldErrors(parsed.error))
      if (parsed.success) signInMutation.mutate(parsed.data)
      return
    }
    const parsed = signUpSchema.safeParse(values)
    setErrors(fieldErrors(parsed.error))
    if (parsed.success) signUpMutation.mutate(parsed.data)
  }

  return (
    <Screen title="CALculator2">
      <p className="text-[15px] text-label-secondary">Track your household’s meals together.</p>
      <div className="mt-6">
        <SegmentedControl
          label="Account"
          options={MODE_OPTIONS}
          value={mode}
          onChange={changeMode}
        />
      </div>
      <form noValidate onSubmit={handleSubmit}>
        <GroupedSection>
          {mode === 'signup' && (
            <TextField
              label="Name"
              autoComplete="name"
              value={values.displayName}
              onChange={update('displayName')}
              error={errors.displayName}
            />
          )}
          <TextField
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={values.email}
            onChange={update('email')}
            error={errors.email}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={values.password}
            onChange={update('password')}
            error={errors.password}
          />
        </GroupedSection>
        {notice && (
          <p
            role="status"
            className="mt-4 rounded-xl bg-accent/10 px-4 py-3 text-[15px] text-label"
          >
            {notice}
          </p>
        )}
        {activeMutation.isError && <ErrorBanner message={toUserMessage(activeMutation.error)} />}
        <div className="mt-6">
          <Button type="submit" loading={activeMutation.isPending}>
            {mode === 'login' ? 'Log in' : 'Create account'}
          </Button>
        </div>
      </form>
    </Screen>
  )
}
