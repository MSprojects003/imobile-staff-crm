import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

const PROGRESS_VALUES = ["pending", "ongoing", "completed"] as const
type WorkProgress = (typeof PROGRESS_VALUES)[number]

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

function isWorkProgress(value: unknown): value is WorkProgress {
  return (
    typeof value === "string" && PROGRESS_VALUES.includes(value as WorkProgress)
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
        { error: "Sign in to update assigned work progress." },
        { status: 401 }
      )
    }

    const { id } = await params
    if (!isUuid(id)) {
      return NextResponse.json(
        { error: "The assigned-work ID is invalid." },
        { status: 400 }
      )
    }

    let body: { progress?: unknown }
    try {
      body = (await request.json()) as typeof body
    } catch {
      return NextResponse.json(
        { error: "Invalid progress update request." },
        { status: 400 }
      )
    }
    if (!isWorkProgress(body.progress)) {
      return NextResponse.json(
        { error: "Select a valid assigned-work progress status." },
        { status: 400 }
      )
    }

    const adminClient = createSupabaseAdminClient()
    const { data: staffData, error: staffError } = await adminClient
      .from("staff")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .eq("is_deleted", false)

    if (staffError) {
      throw new Error(
        `Unable to verify assigned-work access: ${staffError.message}`
      )
    }
    const staffIds = ((staffData ?? []) as { id: string }[]).map(
      (staff) => staff.id
    )
    if (!staffIds.length) {
      return NextResponse.json(
        { error: "You do not have access to update this assigned work." },
        { status: 403 }
      )
    }

    const { data, error } = await adminClient
      .from("assigned_works")
      .update({
        progress: body.progress,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .in("staff_id", staffIds)
      .eq("is_deleted", false)
      .select("id, progress")
      .maybeSingle()

    if (error) {
      throw new Error(
        `Unable to update assigned-work progress: ${error.message}`
      )
    }
    if (!data) {
      return NextResponse.json(
        { error: "You do not have access to update this assigned work." },
        { status: 403 }
      )
    }

    return NextResponse.json({ id: data.id, progress: data.progress })
  } catch (error) {
    console.error("Unable to update assigned-work progress.", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update assigned-work progress.",
      },
      { status: 500 }
    )
  }
}
