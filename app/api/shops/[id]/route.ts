import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

const SHOP_FIELDS = {
  name: { column: "name", required: true },
  owner: { column: "owner", required: true },
  address1: { column: "address1", required: true },
  area: { column: "area", required: true },
  phoneNumber: { column: "phone_number", required: true },
  email: { column: "email", required: false },
} as const

type ShopField = keyof typeof SHOP_FIELDS

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

function isShopField(value: unknown): value is ShopField {
  return typeof value === "string" && value in SHOP_FIELDS
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: "Sign in with an active staff profile to edit shops." },
        { status: 401 }
      )
    }

    const { id } = await params
    if (!isUuid(id)) {
      return NextResponse.json(
        { error: "The shop ID is invalid." },
        { status: 400 }
      )
    }

    let body: { field?: unknown; value?: unknown }
    try {
      body = (await request.json()) as typeof body
    } catch {
      return NextResponse.json(
        { error: "Invalid shop update request." },
        { status: 400 }
      )
    }
    if (!isShopField(body.field) || typeof body.value !== "string") {
      return NextResponse.json(
        { error: "Select a valid shop field and text value." },
        { status: 400 }
      )
    }

    const field = body.field
    const value = body.value.trim()
    if (SHOP_FIELDS[field].required && !value) {
      return NextResponse.json(
        { error: `${field} cannot be empty.` },
        { status: 400 }
      )
    }
    if (
      field === "email" &&
      value &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      )
    }

    const adminClient = createSupabaseAdminClient()
    const { data: staffRows, error: staffError } = await adminClient
      .from("staff")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .eq("is_deleted", false)

    if (staffError) {
      throw new Error(
        `Unable to verify shop edit access: ${staffError.message}`
      )
    }

    const staffIds = ((staffRows ?? []) as { id: string }[]).map(
      (staff) => staff.id
    )
    if (!staffIds.length) {
      return NextResponse.json(
        { error: "You don’t have access to edit this shop." },
        { status: 403 }
      )
    }

    const { data, error } = await adminClient
      .from("shops")
      .update({ [SHOP_FIELDS[field].column]: value || null })
      .eq("id", id)
      .in("created_by_staff_id", staffIds)
      .eq("is_deleted", false)
      .select("id")
      .maybeSingle()

    if (error) {
      throw new Error(`Unable to update shop: ${error.message}`)
    }
    if (!data) {
      return NextResponse.json(
        { error: "You don’t have access to edit this shop." },
        { status: 403 }
      )
    }

    return NextResponse.json({ success: true, field, value })
  } catch (error) {
    console.error("Unable to update shop.", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update shop.",
      },
      { status: 500 }
    )
  }
}
