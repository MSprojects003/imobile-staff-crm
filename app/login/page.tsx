"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import phoneBanner from "@/public/assets/phones-banner.png"
import { LeftBanner } from "@/components/custom/login-ui/left-banner"
import {
  RightSection,
  type StaffMember,
} from "@/components/custom/login-ui/right-section"
import { useAuthRedirect } from "@/hooks/use-auth"

export default function LoginPage() {
  const router = useRouter()
  const checkingSession = useAuthRedirect()
  const [error, setError] = useState<string | null>(null)
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [loadingStaffMembers, setLoadingStaffMembers] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadStaffMembers() {
      try {
        const response = await fetch("/auth")
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error ?? "Unable to load staff users.")
        }

        setStaffMembers(
          result.users.map((user: { id: string; full_name: string }) => ({
            value: user.id,
            label: user.full_name,
          }))
        )
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load staff users."
        )
      } finally {
        setLoadingStaffMembers(false)
      }
    }

    void loadStaffMembers()
  }, [])

  async function handleLogin(userId: string, phone: string) {
    setError(null)
    setLoading(true)

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, phone }),
      })
      const result = await response.json()

      if (!response.ok) {
        setError(result.error ?? "Incorrect credentials.")
        return
      }

      router.push("/otp")
    } catch (authError) {
      setError(
        authError instanceof Error ? authError.message : "Unable to sign in."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <LeftBanner
      bannerImage={phoneBanner}
      bannerTitle={
        <>
          Your Trusted
          <br />
          Mobile Partner
        </>
      }
      bannerDescription="Better Devices, Brighter Future."
    >
      <RightSection
        mode="login"
        staffMembers={staffMembers}
        loadingStaffMembers={loadingStaffMembers}
        loading={loading}
        onLogin={handleLogin}
        error={error}
        sessionChecking={checkingSession}
      />
    </LeftBanner>
  )
}
