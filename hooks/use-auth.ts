"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export function useAuthRedirect() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true

    async function checkSession() {
      const response = await fetch("/auth/session", { cache: "no-store" })

      if (!active) return

      if (response.ok) {
        router.replace("/")
        return
      }

      setChecking(false)
    }

    void checkSession()

    return () => {
      active = false
    }
  }, [router])

  return checking
}
