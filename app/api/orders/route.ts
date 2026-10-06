import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { sendNotifySms } from "@/lib/notify-lk"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type OrderSmsRecipient = {
  kind: "admin" | "shop"
  phone: string | null
  body: string
}

type CreatedOrderResult = {
  order_id: string
  shop_name: string
  estimated_total: number
  full_total: number
  deducted_amount: number
  final_total: number
  products_count: number
  sms_messages: OrderSmsRecipient[]
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  )
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: "Sign in with an active staff profile to place an order." },
        { status: 401 }
      )
    }

    let body: {
      shopId?: unknown
      isNegotiablePrice?: unknown
      deductedAmount?: unknown
      negotiableReason?: unknown
    }
    try {
      body = (await request.json()) as typeof body
    } catch {
      return NextResponse.json(
        { error: "Invalid order request." },
        { status: 400 }
      )
    }

    if (!isUuid(body.shopId)) {
      return NextResponse.json(
        { error: "Select a valid shop before placing the order." },
        { status: 400 }
      )
    }
    if (typeof body.isNegotiablePrice !== "boolean") {
      return NextResponse.json(
        { error: "Negotiated-price selection is invalid." },
        { status: 400 }
      )
    }
    const deductedAmount = Number(body.deductedAmount ?? 0)
    if (!Number.isFinite(deductedAmount) || deductedAmount < 0) {
      return NextResponse.json(
        { error: "Deduction must be a non-negative amount." },
        { status: 400 }
      )
    }
    if (
      body.negotiableReason !== undefined &&
      body.negotiableReason !== null &&
      typeof body.negotiableReason !== "string"
    ) {
      return NextResponse.json(
        { error: "Negotiation reason must be text." },
        { status: 400 }
      )
    }
    const negotiableReason =
      typeof body.negotiableReason === "string"
        ? body.negotiableReason.trim()
        : ""
    if (body.isNegotiablePrice && !negotiableReason) {
      return NextResponse.json(
        { error: "Provide a reason when the price is negotiable." },
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
      .limit(2)

    if (staffError) {
      throw new Error(`Unable to resolve the current staff record: ${staffError.message}`)
    }
    if (!staffRows?.length) {
      return NextResponse.json(
        { error: "No active staff record is linked to the signed-in user." },
        { status: 422 }
      )
    }
    if (staffRows.length > 1) {
      return NextResponse.json(
        { error: "Multiple staff records are linked to the signed-in user." },
        { status: 409 }
      )
    }

    const { data, error } = await adminClient.rpc("create_order_from_cart", {
      p_staff_id: staffRows[0].id,
      p_user_id: user.id,
      p_shop_id: body.shopId,
      p_is_negotiable_price: body.isNegotiablePrice,
      p_deducted_amount: body.isNegotiablePrice ? deductedAmount : 0,
      p_negotiable_reason: body.isNegotiablePrice ? negotiableReason : null,
    })

    if (error) {
      const message =
        error.code === "PGRST202" ||
        /function .*create_order_from_cart.* does not exist/i.test(
          error.message
        )
          ? "Order database setup is incomplete. Run supabase/orders.sql in the Supabase SQL Editor."
          : `Unable to place order: ${error.message}`
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const order = data as CreatedOrderResult
    if (
      !order ||
      typeof order.order_id !== "string" ||
      !/^ORD_[0-9]{3,}$/.test(order.order_id) ||
      !Array.isArray(order.sms_messages)
    ) {
      console.error("Order RPC returned an invalid result.", data)
      return NextResponse.json(
        { error: "The order was created, but its confirmation data was invalid." },
        { status: 500 }
      )
    }

    const smsResults = await Promise.allSettled(
      order.sms_messages.map(async (recipient) => {
        if (!recipient.phone) {
          throw new Error(`${recipient.kind} SMS recipient has no phone number.`)
        }
        await sendNotifySms(recipient.phone, recipient.body)
      })
    )
    const failedAdminSms = smsResults.filter(
      (result, index) =>
        result.status === "rejected" &&
        order.sms_messages[index]?.kind === "admin"
    ).length
    const failedShopSms = smsResults.some(
      (result, index) =>
        result.status === "rejected" &&
        order.sms_messages[index]?.kind === "shop"
    )

    smsResults.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          `Notify.lk order SMS failed for ${order.sms_messages[index]?.kind ?? "unknown"} recipient:`,
          result.reason
        )
      }
    })

    return NextResponse.json(
      {
        orderId: order.order_id,
        shopName: order.shop_name,
        estimatedTotal: Number(order.estimated_total),
        fullTotal: Number(order.full_total),
        deductedAmount: Number(order.deducted_amount),
        finalTotal: Number(order.final_total),
        productsCount: order.products_count,
        smsDelivery: {
          sent: smsResults.length - smsResults.filter(
            (result) => result.status === "rejected"
          ).length,
          failed: failedAdminSms + Number(failedShopSms),
          adminFailed: failedAdminSms,
          shopFailed: failedShopSms,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Unable to place order.", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to place order.",
      },
      { status: 500 }
    )
  }
}
