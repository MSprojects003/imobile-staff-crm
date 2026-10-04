import { NextResponse } from "next/server"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from("users")
      .select("id, full_name")
      .eq("status", true)
      .eq("is_rep", true)
      .eq("is_admin", false)
      .eq("is_sub_admin", false)
      .eq("is_shop", false)
      .order("full_name", { ascending: true })

    if (error) {
      console.error("Unable to load active staff users.", error)
      return NextResponse.json(
        { error: "Unable to load staff users." },
        { status: 500 }
      )
    }

    return NextResponse.json({ users: data })
  } catch (error) {
    console.error("Staff user list configuration failed.", error)
    return NextResponse.json(
      { error: "Authentication service is not configured." },
      { status: 500 }
    )
  }
}
