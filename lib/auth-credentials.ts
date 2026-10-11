import { createHmac } from "node:crypto"

export function normalizeStaffPhone(value: string) {
  const digits = value.replace(/\D/g, "")

  if (digits.startsWith("0094")) return `+${digits.slice(2)}`
  if (digits.startsWith("94")) return `+${digits}`
  if (digits.startsWith("0")) return `+94${digits.slice(1)}`
  return `+94${digits}`
}

export function getStaffAuthPassword(phone: string) {
  const secret = process.env.SUPABASE_SECRET_KEY

  if (!secret) {
    throw new Error("Missing SUPABASE_SECRET_KEY.")
  }

  return `staff-${createHmac("sha256", secret).update(phone).digest("hex")}`
}
