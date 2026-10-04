import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    return NextResponse.json({
      authenticated: true,
      user: { id: user.id, fullName: user.full_name },
    })
  } catch (error) {
    console.error("Unable to check staff session.", error)
    return NextResponse.json(
      { error: "Unable to check authentication." },
      { status: 500 }
    )
  }
}
