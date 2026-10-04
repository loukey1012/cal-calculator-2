import { onColor } from '../../lib/color'

type AvatarProps = {
  readonly name: string
  /** #rrggbb; each person's avatar uses their own accent color */
  readonly color: string
  readonly size?: 'small' | 'large'
}

const SIZE_CLASSES = { small: 'h-8 w-8 text-[14px]', large: 'h-10 w-10 text-[16px]' } as const

/** Initial on a colored circle; decorative, the name is always shown next to it. */
export function Avatar({ name, color, size = 'small' }: AvatarProps) {
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? '?'
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full font-extrabold ${SIZE_CLASSES[size]}`}
      style={{ backgroundColor: color, color: onColor(color) }}
    >
      {initial}
    </span>
  )
}
