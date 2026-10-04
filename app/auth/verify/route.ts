import { NextResponse } from "next/server"

import { getStaffAuthPassword } from "@/lib/auth-credentials"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { consumePendingAuthOtp, getPendingAuth } from "@/lib/pending-auth"

export async function POST(request: Request) {
  let body: { token?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid verification request." },
      { status: 400 }
    )
  }

  if (!body.token || !/^\d{6}$/.test(body.token)) {
    return NextResponse.json(
      { error: "Enter the six-digit verification code." },
      { status: 400 }
    )
  }

  try {
    const pendingAuth = await getPendingAuth()

    if (!pendingAuth) {
      return NextResponse.json(
        { error: "This verification has expired. Please sign in again." },
        { status: 401 }
      )
    }

    if (!(await consumePendingAuthOtp(body.token))) {
      return NextResponse.json(
        { error: "The verification code is invalid or expired." },
        { status: 401 }
      )
    }

    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      phone: pendingAuth.phone,
      password: getStaffAuthPassword(pendingAuth.phone),
    })

    if (error || !data.session) {
      return NextResponse.json(
        { error: "Unable to create the Supabase session." },
        { status: 503 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Staff Supabase OTP verification failed.", error)
    return NextResponse.json(
      { error: "Unable to complete authentication." },
      { status: 500 }
    )
  }
}
