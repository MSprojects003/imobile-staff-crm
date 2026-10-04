"use client"

import { useState } from "react"
import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)

    try {
      const response = await fetch("/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        throw new Error("Unable to log out.")
      }

      router.replace("/login")
      router.refresh()
    } catch {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="h-10 rounded-lg bg-[#e7242b] px-4 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(231,36,43,0.2)] transition hover:bg-[#d91d24]"
    >
      {loading ? (
        <>
          <Spinner className="size-4" />
          Logging out...
        </>
      ) : (
        <>
          <LogOut className="size-4" />
          Log out
        </>
      )}
    </Button>
  )
}
