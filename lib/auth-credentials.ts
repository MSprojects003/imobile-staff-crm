import { createHmac } from "node:crypto"

export function getStaffAuthPassword(phone: string) {
  const secret = process.env.SUPABASE_SECRET_KEY

  if (!secret) {
    throw new Error("Missing SUPABASE_SECRET_KEY.")
  }

  return `staff-${createHmac("sha256", secret).update(phone).digest("hex")}`
}
