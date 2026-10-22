import { hc } from "hono/client"
import type { AppType } from "@server/app.ts"

export const client = hc<AppType>("/")
