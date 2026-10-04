import { Suspense } from "react"

import { OtpClient } from "./otp-client"

export default function OtpPage() {
  return (
    <Suspense>
      <OtpClient />
    </Suspense>
  )
}
