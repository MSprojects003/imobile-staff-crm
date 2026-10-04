"use client"

import { useEffect, useRef, useState } from "react"
import PhoneInput from "react-phone-input-2"
import "react-phone-input-2/lib/style.css"
import { ArrowLeft, UserRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"

export type StaffMember = {
  value: string
  label: string
}

type RightSectionProps = {
  mode?: "login" | "otp"
  staffMembers?: StaffMember[]
  loadingStaffMembers?: boolean
  loading?: boolean
  sessionChecking?: boolean
  onLogin?: (userId: string, phone: string) => void | Promise<void>
  onVerify?: (token: string) => void | Promise<void>
  onBack?: () => void
  error?: string | null
}

export function RightSection({
  mode = "login",
  staffMembers = [],
  loadingStaffMembers = false,
  loading = false,
  sessionChecking = false,
  onLogin,
  onVerify,
  onBack,
  error,
}: RightSectionProps) {
  const [staffMember, setStaffMember] = useState("")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const submittedOtp = useRef("")
  const selectedStaffMember = staffMembers.find(
    (member) => member.value === staffMember
  )

  useEffect(() => {
    if (
      mode === "otp" &&
      otp.length === 6 &&
      !loading &&
      submittedOtp.current !== otp
    ) {
      submittedOtp.current = otp
      void onVerify?.(otp)
    }
  }, [loading, mode, onVerify, otp])

  if (sessionChecking) {
    return null
  }

  return (
    <section className="w-full rounded-md border border-[#edf0f2] bg-white/95 px-6 py-8 shadow-[0_18px_10px_rgba(29,52,74,0.11)] sm:px-8 sm:py-9 lg:max-w-[500px] lg:px-10 lg:py-16">
      <div className="w-full">
        <div className="mb-9">
          {mode === "otp" && (
            <button
              type="button"
              onClick={onBack}
              className="mb-6 flex items-center gap-2 text-xs font-semibold text-[#687887] transition hover:text-[#192d4a]"
            >
              <ArrowLeft className="size-4" />
              Back to login
            </button>
          )}
          <h1 className="text-3xl font-bold tracking-tight text-[#192d4a]">
            {mode === "login" ? "Staff Login" : "OTP Verification"}
          </h1>
          <p className="mt-2 max-w-xs text-xs leading-5 text-[#7a8490] sm:text-[13px]">
            {mode === "login"
              ? "Select your name and enter your mobile number to continue."
              : "Enter the verification code sent to your mobile number."}
          </p>
        </div>

        {mode === "login" ? (
          <form
            className="space-y-5"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                event.currentTarget.requestSubmit()
              }
            }}
            onSubmit={(event) => {
              event.preventDefault()
              if (staffMember && phone) {
                onLogin?.(staffMember, phone)
              }
            }}
          >
            <div>
              <label
                className="mb-1.5 block text-xs font-semibold text-[#5d6b7a]"
                htmlFor="staff"
              >
                Staff name
              </label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-[#243c56]" />
                <Select
                  value={staffMember}
                  onValueChange={(value) => {
                    if (value !== null) setStaffMember(value)
                  }}
                >
                  <SelectTrigger
                    id="staff"
                    className="h-12 w-full rounded-xl border-[#dfe6ec] bg-white pl-10 text-sm font-medium text-[#263b52] shadow-[0_3px_10px_rgba(29,52,74,0.06)] transition hover:border-[#cbd6df] focus-visible:border-[#e7242b] focus-visible:ring-[#e7242b]/15"
                  >
                    <SelectValue>
                      {selectedStaffMember?.label ??
                        (loadingStaffMembers
                          ? "Loading staff names..."
                          : "Select staff name")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="border border-[#e1e7ec] bg-white p-1.5 text-gray-700 shadow-[0_12px_30px_rgba(29,52,74,0.12)]">
                    {staffMembers.map((member) => (
                      <SelectItem
                        key={member.value}
                        value={member.value}
                        className="rounded-lg px-3 py-2.5 text-sm !text-gray-700 hover:!text-gray-700 focus:!text-gray-700 data-[highlighted]:bg-[#fff1f1] data-[highlighted]:!text-gray-700 data-[selected]:!text-gray-700 [&_*]:!text-gray-700"
                      >
                        {member.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label
                className="mb-1.5 block text-xs font-semibold text-[#5d6b7a]"
                htmlFor="phone"
              >
                Phone number
              </label>
              <PhoneInput
                country="lk"
                value={phone}
                onChange={setPhone}
                inputProps={{ id: "phone", name: "phone", required: true }}
                placeholder="+94 77 123 4567"
                containerClass="login-phone"
                inputClass="!h-11 !w-full !rounded-lg !border-[#e1e7ec] !pl-[52px] !text-[13px] !font-medium !text-[#263b52] !shadow-[0_2px_8px_rgba(29,52,74,0.05)]"
                buttonClass="!rounded-l-lg !border-[#e1e7ec] !bg-white"
                dropdownClass="!rounded-lg !text-[13px] [&_.country]:!text-gray-700 [&_.country:hover]:!text-gray-700 [&_.country.highlight]:!text-gray-700 [&_.country-name]:!text-gray-700 [&_.dial-code]:!text-gray-700"
              />
            </div>

            <Button
              type="submit"
              disabled={loadingStaffMembers || loading || !staffMembers.length}
              className="mt-2 h-11 w-full rounded-lg bg-[#e7242b] text-sm font-semibold text-white shadow-[0_6px_16px_rgba(231,36,43,0.2)] hover:bg-[#d91d24]"
            >
              {loading ? (
                <>
                  <Spinner className="size-4" />
                  Sending OTP...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>
        ) : (
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault()
              onVerify?.(otp)
            }}
          >
            <div>
              <label className="mb-2 block text-xs font-semibold text-[#5d6b7a]">
                Verification code
              </label>
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
                autoFocus
                className="w-full justify-between"
              >
                <InputOTPGroup className="w-full justify-between gap-2">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="size-11 flex-1 rounded-lg border text-base font-semibold !text-gray-950 first:border last:border sm:size-12 [&_*]:!text-gray-950"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#fff5f5] px-3 text-xs font-semibold text-[#c51e27]"
              aria-live="polite"
            >
              {loading ? (
                <>
                  <Spinner className="size-4" />
                  Verifying your code...
                </>
              ) : (
                "Verification starts automatically after all six digits are entered."
              )}
            </div>
            <p className="text-center text-xs text-[#7a8490]">
              Didn&apos;t receive the code?{" "}
              <button type="button" className="font-semibold text-[#e7242b]">
                Resend OTP
              </button>
            </p>
          </form>
        )}
        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg bg-[#fff0f0] px-3 py-2 text-xs font-medium text-[#c51e27]"
          >
            {error}
          </p>
        )}
      </div>
    </section>
  )
}
