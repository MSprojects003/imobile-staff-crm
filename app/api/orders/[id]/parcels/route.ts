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
        { error: "Sign in with an active staff profile to update parcels." },
        { status: 401 }
      )
    }

    const { id } = await params
    if (!isUuid(id)) {
      return NextResponse.json(
        { error: "The order ID is invalid." },
        { status: 400 }
      )
    }

    let body: { parcelsDelivered?: unknown }
    try {
      body = (await request.json()) as typeof body
    } catch {
      return NextResponse.json(
        { error: "Invalid parcel count update request." },
        { status: 400 }
      )
    }

    const parcelsDelivered = body.parcelsDelivered
    if (
      typeof parcelsDelivered !== "number" ||
      !Number.isSafeInteger(parcelsDelivered) ||
      parcelsDelivered < 0
    ) {
      return NextResponse.json(
        { error: "Parcels delivered must be a whole number of zero or more." },
        { status: 400 }
      )
    }

    const adminClient = createSupabaseAdminClient()
    const { data, error } = await adminClient
      .from("orders")
      .update({ parcels_delivered: parcelsDelivered })
      .eq("id", id)
      .select("id, parcels_delivered")
      .maybeSingle()

    if (error) {
      throw new Error(`Unable to update delivered parcels: ${error.message}`)
    }
    if (!data) {
      return NextResponse.json(
        { error: "The order was not found." },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      parcelsDelivered: data.parcels_delivered,
    })
  } catch (error) {
    console.error("Unable to update delivered parcels.", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update delivered parcels.",
      },
      { status: 500 }
    )
  }
}
