import { NextResponse } from "next/server"

import { clearPendingAuth } from "@/lib/pending-auth"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error("Staff logout failed.", error)
      return NextResponse.json(
        { error: "Unable to log out. Please try again." },
        { status: 500 }
      )
    }

    await clearPendingAuth()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Staff logout failed.", error)
    return NextResponse.json(
      { error: "Unable to log out. Please try again." },
      { status: 500 }
    )
  }
}
