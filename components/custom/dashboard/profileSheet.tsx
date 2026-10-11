"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import PhoneInput from "react-phone-input-2"
import "react-phone-input-2/lib/style.css"
import {
  Camera,
  Check,
  LoaderCircle,
  Lock,
  ShieldCheck,
  UserRound,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

type Profile = {
  id: string
  fullName: string
  username: string
  phone: string
  profileImageUrl: string | null
  role: string
}

type SavedProfile = {
  fullName: string
  phone: string
  imageUrl: string | null
}

type SavingField = "fullName" | "phone" | "image"

type SaveChange = {
  fullName?: string
  phone?: string
  image?: File
}

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"])
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export function ProfileSheet({
  open,
  onOpenChange,
  user,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: Profile
}) {
  const router = useRouter()
  const [fullName, setFullName] = React.useState(user.fullName)
  const [phone, setPhone] = React.useState(normalizePhoneInputValue(user.phone))
  const [saved, setSaved] = React.useState<SavedProfile>({
    fullName: user.fullName,
    phone: normalizePhoneInputValue(user.phone),
    imageUrl: user.profileImageUrl,
  })
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [savingFields, setSavingFields] = React.useState<Set<SavingField>>(
    new Set()
  )
  const [savedNotice, setSavedNotice] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const savedRef = React.useRef(saved)
  const queueRef = React.useRef<Promise<void>>(Promise.resolve())
  const noticeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  React.useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current)
    }
  }, [])

  function flashSaved() {
    setSavedNotice(true)
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setSavedNotice(false), 2000)
  }

  function applySaved(patch: Partial<SavedProfile>) {
    savedRef.current = { ...savedRef.current, ...patch }
    setSaved(savedRef.current)
  }

  function setFieldSaving(field: SavingField, isSaving: boolean) {
    setSavingFields((current) => {
      const next = new Set(current)
      if (isSaving) next.add(field)
      else next.delete(field)
      return next
    })
  }

  // Saves run one after another so two quick edits can never overwrite each other.
  function runSave(field: SavingField, change: SaveChange) {
    setError(null)
    setFieldSaving(field, true)
    queueRef.current = queueRef.current.then(() => performSave(field, change))
  }

  async function performSave(field: SavingField, change: SaveChange) {
    const base = savedRef.current
    const nextFullName = change.fullName ?? base.fullName
    const nextPhone = change.phone ?? base.phone

    try {
      const formData = new FormData()
      formData.set("full_name", nextFullName)
      formData.set("phone", `+${nextPhone}`)
      if (change.image) formData.set("image", change.image)

      const response = await fetch("/api/profile", {
        method: "PATCH",
        body: formData,
      })
      const result = (await response.json()) as {
        error?: string
        profileImageUrl?: string | null
        imageUrl?: string | null
      }
      if (!response.ok) {
        throw new Error(result.error ?? "Unable to update your profile.")
      }

      const patch: Partial<SavedProfile> = {
        fullName: nextFullName,
        phone: nextPhone,
      }
      const returnedImage = result.profileImageUrl ?? result.imageUrl
      if (change.image && returnedImage) patch.imageUrl = returnedImage
      applySaved(patch)

      if (field === "fullName") setFullName(nextFullName)
      if (field === "phone") setPhone(nextPhone)
      flashSaved()
      router.refresh()
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to update your profile."
      )
      if (field === "fullName") setFullName(base.fullName)
      if (field === "phone") setPhone(base.phone)
      if (field === "image") setPreviewUrl(null)
    } finally {
      setFieldSaving(field, false)
    }
  }

  function commitFullName() {
    const value = fullName.trim()
    if (!value) {
      setError("Full name cannot be empty.")
      setFullName(savedRef.current.fullName)
      return
    }
    if (value === savedRef.current.fullName) {
      if (fullName !== value) setFullName(value)
      return
    }
    runSave("fullName", { fullName: value })
  }

  function commitPhone() {
    if (phone === savedRef.current.phone) return
    if (phone.replace(/\D/g, "").length < 9) {
      setError("Enter a valid phone number.")
      setPhone(savedRef.current.phone)
      return
    }
    runSave("phone", { phone })
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const image = event.target.files?.[0] ?? null
    event.target.value = ""
    if (!image) return

    if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
      setError("Profile photo must be a PNG, JPG, or WebP image.")
      return
    }
    if (image.size > MAX_IMAGE_BYTES) {
      setError("Profile photo must be 5 MB or smaller.")
      return
    }

    setPreviewUrl(URL.createObjectURL(image))
    runSave("image", { image })
  }

  const displayedImage = previewUrl ?? saved.imageUrl
  const isUploadingImage = savingFields.has("image")

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-dvh w-full flex-col gap-0 overflow-hidden bg-slate-50 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-slate-200 bg-white px-4 py-3.5 pr-12 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700 ring-1 ring-red-100">
                <UserRound aria-hidden="true" className="size-4" />
              </span>
              <div className="min-w-0">
                <SheetTitle className="text-sm font-semibold text-slate-900">
                  Account profile
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500">
                  Manage your name, phone number and photo.
                </SheetDescription>
              </div>
            </div>
            {savedNotice && (
              <span
                role="status"
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-100"
              >
                <Check aria-hidden="true" className="size-3" />
                Saved
              </span>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-3.5 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
            >
              {error}
            </p>
          ) : null}

          {/* Identity */}
          <section className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="relative shrink-0">
              <div className="relative flex size-16 items-center justify-center overflow-hidden rounded-full bg-red-50 text-lg font-semibold text-red-700 ring-2 ring-white shadow-sm">
                {displayedImage ? (
                  <Image
                    src={displayedImage}
                    alt={`${saved.fullName || "Profile"} profile photo`}
                    fill
                    sizes="64px"
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  getInitials(fullName)
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                aria-label="Change profile photo"
                className="absolute -right-0.5 -bottom-0.5 grid size-7 place-items-center rounded-full border-2 border-white bg-slate-900 text-white shadow-sm transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isUploadingImage ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-3.5 animate-spin"
                  />
                ) : (
                  <Camera aria-hidden="true" className="size-3.5" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                tabIndex={-1}
                onChange={handleImageChange}
              />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-slate-900">
                {saved.fullName || "Your profile"}
              </h2>
              <p className="truncate text-xs text-slate-500">
                @{user.username}
              </p>
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 capitalize">
                <ShieldCheck aria-hidden="true" className="size-3" />
                {user.role}
              </span>
              <p className="mt-1.5 text-[11px] text-slate-400">
                PNG, JPG or WebP · up to 5 MB
              </p>
            </div>
          </section>

          {/* Editable details */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-xs font-semibold text-slate-900">
                Personal information
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Changes save automatically when you leave a field.
              </p>
            </div>
            <div className="space-y-4 p-4">
              <Field
                id="profile-full-name"
                label="Full name"
                saving={savingFields.has("fullName")}
              >
                <Input
                  id="profile-full-name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  onBlur={commitFullName}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur()
                  }}
                  disabled={savingFields.has("fullName")}
                  maxLength={120}
                  autoComplete="name"
                  placeholder="Enter your full name"
                  className="h-9 rounded-lg border-slate-200 bg-white text-[13px] font-medium text-slate-900 shadow-none"
                />
              </Field>

              <Field
                id="profile-phone"
                label="Phone number"
                saving={savingFields.has("phone")}
              >
                <PhoneInput
                  country="lk"
                  disableDropdown
                  value={phone}
                  onChange={setPhone}
                  onBlur={commitPhone}
                  disabled={savingFields.has("phone")}
                  inputProps={{
                    id: "profile-phone",
                    name: "phone",
                    autoComplete: "tel",
                    "aria-label": "Phone number",
                  }}
                  containerClass="!w-full"
                  inputClass="!h-9 !w-full !rounded-lg !border-slate-200 !bg-white !pl-[48px] !text-[13px] !font-medium !text-slate-900 !shadow-none focus:!border-slate-400 focus:!ring-2 focus:!ring-slate-100"
                  buttonClass="!rounded-l-lg !border-slate-200 !bg-slate-50"
                />
              </Field>
            </div>
          </section>

          {/* Read-only details */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-xs font-semibold text-slate-900">Account</h3>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Your username and staff role are managed by an administrator.
              </p>
            </div>
            <div className="space-y-4 p-4">
              <Field id="profile-username" label="Username">
                <ReadOnlyValue id="profile-username" value={user.username} />
              </Field>
              <Field id="profile-role" label="Role">
                <ReadOnlyValue
                  id="profile-role"
                  value={user.role}
                  capitalize
                />
              </Field>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Field({
  id,
  label,
  saving = false,
  children,
}: {
  id: string
  label: string
  saving?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase"
        >
          {label}
        </label>
        {saving && (
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
            <LoaderCircle
              aria-hidden="true"
              className="size-3 animate-spin"
            />
            Saving
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function ReadOnlyValue({
  id,
  value,
  capitalize = false,
}: {
  id: string
  value: string
  capitalize?: boolean
}) {
  return (
    <div
      id={id}
      className="flex h-9 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13px] font-medium text-slate-700"
    >
      <span className={`truncate ${capitalize ? "capitalize" : ""}`}>
        {value}
      </span>
      <Lock aria-hidden="true" className="size-3.5 shrink-0 text-slate-400" />
    </div>
  )
}

function normalizePhoneInputValue(phone: string) {
  const digits = phone.replace(/\D/g, "")
  if (digits.startsWith("0094")) return digits.slice(2)
  if (digits.startsWith("94")) return digits
  if (digits.startsWith("0")) return `94${digits.slice(1)}`
  return `94${digits}`
}

function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  )
}WritableStreamDefaultWriter