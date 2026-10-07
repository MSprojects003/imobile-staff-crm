import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

const ITEM_STATUSES = ["pending", "packing", "processing", "no_items"] as const

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
          error: "Sign in with an active staff profile to update order items.",
        },
        { status: 401 }
      )
    }

    const { id } = await params
    if (!isUuid(id)) {
      return NextResponse.json(
        { error: "The sub-order item ID is invalid." },
        { status: 400 }
      )
    }

    let body: { status?: unknown }
    try {
      body = (await request.json()) as typeof body
    } catch {
      return NextResponse.json(
        { error: "Invalid order item status request." },
        { status: 400 }
      )
    }

    if (
      typeof body.status !== "string" ||
      !ITEM_STATUSES.includes(body.status as (typeof ITEM_STATUSES)[number])
    ) {
      return NextResponse.json(
        { error: "Select a valid order item status." },
        { status: 400 }
      )
    }

    const adminClient = createSupabaseAdminClient()
    const { data, error } = await adminClient.rpc(
      "update_sub_order_item_status",
      {
        p_sub_order_item_id: id,
        p_status: body.status,
        p_actor_user_id: user.id,
      }
    )

    if (error) {
      throw new Error(`Unable to update order item status: ${error.message}`)
    }

    return NextResponse.json({ success: true, ...data })
  } catch (error) {
    console.error("Unable to update order item status.", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update order item status.",
      },
      { status: 500 }
    )
  }
}
