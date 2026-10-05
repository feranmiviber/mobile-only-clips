import { z } from 'zod'

// Fan library validation
export const fanLibrarySchema = z.object({
  email: z.string().email('Invalid email address'),
  accessCode: z.string().regex(/^[A-HJ-NP-Z2-9]{12}$/, 'Invalid access code format'),
  deviceId: z.string().min(8, 'Invalid device ID'),
})

// Payment validation
export const paymentSchema = z.object({
  clipId: z.string().min(1, 'Clip ID is required'),
  buyerEmail: z.string().email('Invalid email address'),
  deviceId: z.string().min(8, 'Invalid device ID'),
})

// Webhook validation (basic structure)
export const webhookSchema = z.object({
  payment_id: z.string().optional(),
  payment_status: z.string().optional(),
  updated_at: z.string().optional(),
  created_at: z.string().optional(),
})

export type FanLibraryInput = z.infer<typeof fanLibrarySchema>
export type PaymentInput = z.infer<typeof paymentSchema>
export type WebhookInput = z.infer<typeof webhookSchema>
