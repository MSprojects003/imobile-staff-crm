import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 }
      )
    }

    const adminClient = createSupabaseAdminClient()
    const { data: records, error } = await adminClient
      .from("monthly_targets")
      .select("month, year, target_amount, achieved_amount")
      .eq("staff_id", user.id)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .abortSignal(AbortSignal.timeout(10_000))

    if (error) {
      throw new Error(`Unable to load sales targets: ${error.message}`)
    }

    return NextResponse.json({ records: records ?? [] })
  } catch (error) {
    console.error("Unable to load monthly targets.", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load sales targets.",
      },
      { status: 500 }
    )
  }
}
