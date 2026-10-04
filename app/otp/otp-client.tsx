"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import otp from "@/public/assets/otp.png"

import { LeftBanner } from "@/components/custom/login-ui/left-banner"
import { RightSection } from "@/components/custom/login-ui/right-section"
import { useAuthRedirect } from "@/hooks/use-auth"

export function OtpClient() {
  const router = useRouter()
  const checkingSession = useAuthRedirect()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleVerify(token: string) {
    if (token.length !== 6) {
      setError("Enter the six-digit verification code.")
      return
    }

    setError(null)
    setLoading(true)

    try {
      const response = await fetch("/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const result = await response.json()

      if (!response.ok) {
        setError(result.error ?? "Unable to verify OTP.")
        return
      }

      router.replace("/")
    } catch (authError) {
      setError(
        authError instanceof Error ? authError.message : "Unable to verify OTP."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <LeftBanner
      bannerImage={otp}
      bannerTitle={
        <>
          Secure Access,
          <br />
          Made Simple
        </>
      }
      bannerDescription="One more step to keep your account secure."
    >
      <RightSection
        mode="otp"
        onVerify={handleVerify}
        onBack={() => router.push("/login")}
        error={error}
        loading={loading}
        sessionChecking={checkingSession}
      />
    </LeftBanner>
  )
}
