import { z } from 'zod'

const EMAIL_MESSAGE = 'Enter a valid email address'
const MIN_PASSWORD_LENGTH = 8
const MAX_NAME_LENGTH = 40

const email = z.string().trim().toLowerCase().pipe(z.email(EMAIL_MESSAGE))

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
})

export const signUpSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Enter your name')
    .max(MAX_NAME_LENGTH, `Use at most ${MAX_NAME_LENGTH} characters`),
  email,
  password: z.string().min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`),
})

export type LoginInput = z.infer<typeof loginSchema>
export type SignUpInput = z.infer<typeof signUpSchema>
