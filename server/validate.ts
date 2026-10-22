import { zValidator } from "@hono/zod-validator"
import { type ValidationTargets } from "hono"
import { HTTPException } from "hono/http-exception"
import { type ZodType } from "zod"

export const validate = <
  Schema extends ZodType,
  Target extends keyof ValidationTargets,
>(
  target: Target,
  schema: Schema,
) =>
  zValidator(target, schema, (result) => {
    if (!result.success) {
      throw new HTTPException(400, {
        message: result.error.issues.map(({ message }) => message).join(", "),
      })
    }
  })
