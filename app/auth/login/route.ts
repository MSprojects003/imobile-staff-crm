import { createHmac, randomInt } from "node:crypto"
import { NextResponse } from "next/server"

import { getStaffAuthPassword } from "@/lib/auth-credentials"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { setPendingAuth } from "@/lib/pending-auth"

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "")

  if (digits.startsWith("0094")) return `+${digits.slice(2)}`
  if (digits.startsWith("94")) return `+${digits}`
  if (digits.startsWith("0")) return `+94${digits.slice(1)}`
  return `+94${digits}`
}

async function sendNotifyOtp(phone: string, code: string) {
  const { NOTIFY_LK_API_KEY, NOTIFY_LK_USER_ID, NOTIFY_LK_SENDER_ID } =
    process.env

  if (!NOTIFY_LK_API_KEY || !NOTIFY_LK_USER_ID || !NOTIFY_LK_SENDER_ID) {
    throw new Error("Notify.lk is not configured.")
  }

  const response = await fetch("https://app.notify.lk/api/v1/send", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      user_id: NOTIFY_LK_USER_ID,
      api_key: NOTIFY_LK_API_KEY,
      sender_id: NOTIFY_LK_SENDER_ID,
      to: phone.replace(/\D/g, ""),
      message: `Your iMobile verification code is ${code}. It expires in 5 minutes.`,
    }),
    cache: "no-store",
  })

  const responseText = await response.text()
  let result: { status?: string } | null = null
  try {
    result = JSON.parse(responseText) as { status?: string }
  } catch {
    // Notify.lk may return plain text for a successful request.
  }

  if (
    !response.ok ||
    (result?.status && result.status.toLowerCase() !== "success")
  ) {
    throw new Error("Notify.lk could not send the verification code.")
  }
}

export async function POST(request: Request) {
  let body: { userId?: string; phone?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid login request." },
      { status: 400 }
    )
  }

  if (!body.userId || !body.phone) {
    return NextResponse.json(
      { error: "Select a staff name and enter a phone number." },
      { status: 400 }
    )
  }

  try {
    const adminClient = createSupabaseAdminClient()
    const { data: user, error } = await adminClient
      .from("users")
      .select("id, phone")
      .eq("id", body.userId)
      .eq("status", true)
      .eq("is_rep", true)
      .eq("is_admin", false)
      .eq("is_sub_admin", false)
      .eq("is_shop", false)
      .maybeSingle()

    if (error) throw error

    if (!user || normalizePhone(user.phone) !== normalizePhone(body.phone)) {
      return NextResponse.json(
        { error: "Incorrect credentials." },
        { status: 401 }
      )
    }

    const phone = normalizePhone(user.phone)
    let authUser = null
    for (let page = 1; ; page += 1) {
      const { data: authUsers, error: authUsersError } =
        await adminClient.auth.admin.listUsers({ page, perPage: 1000 })

      if (authUsersError) throw authUsersError

      authUser =
        authUsers.users.find(
          (candidate) =>
            candidate.phone && normalizePhone(candidate.phone) === phone
        ) ?? null

      if (authUser || authUsers.users.length < 1000) break
    }

    if (!authUser) {
      const { data: created, error: createError } =
        await adminClient.auth.admin.createUser({
          phone,
          phone_confirm: true,
          user_metadata: {
            staff_user_id: user.id,
            source: "staff-portal",
          },
        })

      if (
        createError &&
        createError.code !== "user_already_exists" &&
        createError.code !== "phone_exists"
      ) {
        throw createError
      }

      authUser = created.user ?? null

      if (!authUser) {
        const { data: refreshedUsers, error: refreshError } =
          await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })

        if (refreshError) throw refreshError

        authUser =
          refreshedUsers.users.find(
            (candidate) =>
              candidate.phone && normalizePhone(candidate.phone) === phone
          ) ?? null
      }
    }

    if (!authUser) {
      return NextResponse.json(
        {
          error:
            "The staff phone could not be provisioned in Supabase Auth. Check the server Supabase secret key and Auth user list.",
        },
        { status: 503 }
      )
    }

    const authPassword = getStaffAuthPassword(phone)
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      authUser.id,
      {
        phone,
        password: authPassword,
        phone_confirm: true,
      }
    )
    if (updateError) throw updateError

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0")
    await sendNotifyOtp(phone, code)

    const secret = process.env.SUPABASE_SECRET_KEY
    if (!secret) throw new Error("Missing SUPABASE_SECRET_KEY.")
    const otpHash = createHmac("sha256", secret)
      .update(`${user.id}:${phone}:${code}`)
      .digest("hex")
    await setPendingAuth({ userId: user.id, phone, otpHash })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Staff login authentication failed.", error)
    const authError = error as {
      code?: string
      message?: string
    }

    if (authError.code === "phone_provider_disabled") {
      return NextResponse.json(
        {
          error:
            "Phone authentication is disabled in Supabase. Enable the Phone provider in Authentication > Providers.",
        },
        { status: 503 }
      )
    }

    if (
      authError.code === "sms_provider_disabled" ||
      authError.code === "sms_send_failed"
    ) {
      return NextResponse.json(
        {
          error:
            "Supabase has no SMS provider configured. Configure the Phone provider or an Auth SMS Hook.",
        },
        { status: 503 }
      )
    }

    if (authError.code === "invalid_phone") {
      return NextResponse.json(
        { error: "The staff phone number is not in a valid format." },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: `Supabase authentication failed${authError.code ? ` (${authError.code})` : ""}: ${
          authError.message ??
          "Please check the Supabase Phone provider and SMS configuration."
        }`,
      },
      { status: 500 }
    )
  }
}
