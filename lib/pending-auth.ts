import { createHmac, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"

const COOKIE_NAME = "staff_pending_auth"
const MAX_AGE = 5 * 60

type PendingAuth = {
  userId: string
  phone: string
  otpHash: string
  expiresAt: number
}

function secret() {
  const value = process.env.SUPABASE_SECRET_KEY
  if (!value) throw new Error("Missing SUPABASE_SECRET_KEY.")
  return value
}

function seal(payload: PendingAuth) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = createHmac("sha256", secret()).update(encoded).digest("hex")
  return `${encoded}.${signature}`
}

function open(value: string | undefined) {
  if (!value) return null
  const [encoded, signature] = value.split(".")
  if (!encoded || !signature) return null

  const expected = createHmac("sha256", secret()).update(encoded).digest("hex")
  const receivedBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return null
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString()
    ) as PendingAuth
    return payload.expiresAt > Date.now() ? payload : null
  } catch {
    return null
  }
}

export async function setPendingAuth(auth: Omit<PendingAuth, "expiresAt">) {
  const cookieStore = await cookies()
  cookieStore.set(
    COOKIE_NAME,
    seal({ ...auth, expiresAt: Date.now() + MAX_AGE * 1000 }),
    {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE,
    }
  )
}

export async function getPendingAuth() {
  const cookieStore = await cookies()
  return open(cookieStore.get(COOKIE_NAME)?.value)
}

export async function consumePendingAuthOtp(token: string) {
  const cookieStore = await cookies()
  const pendingAuth = open(cookieStore.get(COOKIE_NAME)?.value)
  if (!pendingAuth) return null

  const expected = createHmac("sha256", secret())
    .update(`${pendingAuth.userId}:${pendingAuth.phone}:${token}`)
    .digest("hex")
  const receivedBuffer = Buffer.from(pendingAuth.otpHash)
  const expectedBuffer = Buffer.from(expected)

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return null
  }

  cookieStore.delete(COOKIE_NAME)
  return pendingAuth
}

export async function clearPendingAuth() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}
