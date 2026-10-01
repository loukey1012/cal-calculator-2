import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'filled' | 'plain' | 'destructive'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly variant?: ButtonVariant
  readonly loading?: boolean
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  filled: 'w-full rounded-xl bg-accent px-4 py-3.5 text-[17px] font-semibold text-white',
  plain: 'px-2 py-2 text-[17px] text-accent',
  destructive: 'w-full rounded-xl bg-bg-elevated px-4 py-3 text-[17px] text-destructive',
}

export function Button({
  variant = 'filled',
  loading = false,
  disabled,
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${VARIANT_CLASSES[variant]} transition-opacity active:opacity-60 disabled:opacity-40 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
