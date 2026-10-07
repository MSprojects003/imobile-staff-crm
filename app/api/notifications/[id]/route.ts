import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        {
          error:
            "Sign in with an active staff profile to update notifications.",
        },
        { status: 401 }
      )
    }

    const { id } = await params
    if (!isUuid(id)) {
      return NextResponse.json(
        { error: "The notification ID is invalid." },
        { status: 400 }
      )
    }

    let body: { isRead?: unknown }
    try {
      body = (await request.json()) as typeof body
    } catch {
      return NextResponse.json(
        { error: "Invalid notification update request." },
        { status: 400 }
      )
    }
    if (typeof body.isRead !== "boolean") {
      return NextResponse.json(
        { error: "Select whether the notification is read or unread." },
        { status: 400 }
      )
    }

    const adminClient = createSupabaseAdminClient()
    const { data, error } = await adminClient
      .from("notifications")
      .update({
        is_read: body.isRead,
        read_at: body.isRead ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .eq("to_user_id", user.id)
      .select("id")
      .maybeSingle()

    if (error) {
      throw new Error(`Unable to update notification: ${error.message}`)
    }
    if (!data) {
      return NextResponse.json(
        { error: "This notification was not found for your account." },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unable to update notification.", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update notification.",
      },
      { status: 500 }
    )
  }
}
