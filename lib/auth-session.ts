import { createHmac, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"

const SESSION_COOKIE = "staff_session"
const CHALLENGE_COOKIE = "staff_otp_challenge"
const SESSION_MAX_AGE = 60 * 60 * 8
const OTP_MAX_AGE = 60 * 5

type SessionPayload = {
  userId: string
  expiresAt: number
}

type OtpChallenge = SessionPayload & {
  phone: string
  otpHash: string
}

function getSecret() {
  const secret = process.env.SUPABASE_SECRET_KEY

  if (!secret) {
    throw new Error("Missing SUPABASE_SECRET_KEY.")
  }

  return secret
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("hex")
}

function encode(payload: object) {
  const value = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return `${value}.${sign(value)}`
}

function decode<T>(value: string | undefined): T | null {
  if (!value) return null

  const [encoded, signature] = value.split(".")
  if (!encoded || !signature) return null

  const expectedSignature = sign(encoded)
  const received = Buffer.from(signature)
  const expected = Buffer.from(expectedSignature)

  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    return null
  }

  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString()) as T
  } catch {
    return null
  }
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  }
}

export function hashOtp(otp: string, challengeId: string) {
  return createHmac("sha256", getSecret())
    .update(`${challengeId}:${otp}`)
    .digest("hex")
}

export async function setOtpChallenge(challenge: OtpChallenge) {
  const cookieStore = await cookies()
  cookieStore.set(
    CHALLENGE_COOKIE,
    encode(challenge),
    cookieOptions(OTP_MAX_AGE)
  )
}

export async function consumeOtpChallenge(otp: string) {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(CHALLENGE_COOKIE)?.value
  const challenge = decode<OtpChallenge>(cookie)

  if (!challenge || challenge.expiresAt < Date.now()) {
    return null
  }

  const challengeId = `${challenge.userId}:${challenge.expiresAt}:${challenge.phone}`
  const actualHash = hashOtp(otp, challengeId)
  const received = Buffer.from(actualHash)
  const expected = Buffer.from(challenge.otpHash)

  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    return null
  }

  cookieStore.delete(CHALLENGE_COOKIE)
  return challenge
}

export async function setSession(userId: string) {
  const cookieStore = await cookies()
  cookieStore.set(
    SESSION_COOKIE,
    encode({ userId, expiresAt: Date.now() + SESSION_MAX_AGE * 1000 }),
    cookieOptions(SESSION_MAX_AGE)
  )
}

export async function getSession() {
  const cookieStore = await cookies()
  const session = decode<SessionPayload>(cookieStore.get(SESSION_COOKIE)?.value)

  if (!session || session.expiresAt < Date.now()) {
    return null
  }

  return session
}
