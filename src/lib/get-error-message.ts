import { DetailedError } from "hono/client"
import { z } from "zod"

const FALLBACK_ERROR_MESSAGE = "Something went wrong"

const errorDetailSchema = z.object({
  data: z.object({ error: z.string() }),
})

export const getErrorMessage = (error: unknown) => {
  if (error instanceof DetailedError) {
    const detail = errorDetailSchema.safeParse(error.detail)
    if (detail.success) return detail.data.data.error
  }

  if (error instanceof Error) return error.message
  return FALLBACK_ERROR_MESSAGE
}
