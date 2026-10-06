"use client"

import * as React from "react"
import PhoneInput from "react-phone-input-2"
import "react-phone-input-2/lib/style.css"
import {
  ImagePlus,
  LoaderCircle,
  Plus,
  Camera,
  Store,
  Trash2,
  Upload,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { CreateShopInput } from "@/lib/api/shops"

type ImagePreview = {
  file: File
  url: string
}

const FIELD_CLASS =
  "h-10 rounded-lg border-slate-200 bg-white text-sm focus-visible:border-red-400 focus-visible:ring-red-100"

const UPLOAD_LABEL_CLASS =
  "relative flex cursor-pointer items-center justify-center gap-2 overflow-hidden border border-dashed border-red-200 bg-red-50/40 px-3 py-3 text-center transition hover:border-red-400 hover:bg-red-50"

export function CreateShopSheet({
  onCreate,
  trigger,
}: {
  onCreate: (shop: CreateShopInput) => Promise<void>
  trigger?: (open: () => void) => React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [owner, setOwner] = React.useState("")
  const [address1, setAddress1] = React.useState("")
  const [area, setArea] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [previews, setPreviews] = React.useState<ImagePreview[]>([])
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    return () => previews.forEach(({ url }) => URL.revokeObjectURL(url))
  }, [previews])

  const resetForm = () => {
    setName("")
    setOwner("")
    setAddress1("")
    setArea("")
    setPhone("")
    setEmail("")
    setPreviews([])
    setError(null)
  }

  const removeImage = (fileToRemove: File) => {
    setPreviews((current) =>
      current.filter(({ file }) => file !== fileToRemove)
    )
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return
    setError(null)
    setIsSubmitting(true)

    try {
      await onCreate({
        name: name.trim(),
        owner: owner.trim(),
        address1: address1.trim(),
        area: area.trim(),
        phone_number: `+${phone}`,
        email: email.trim() || null,
        images: previews.map(({ file }) => file),
      })
      resetForm()
      setOpen(false)
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Unable to create the shop."
      setError(message)
      console.error("Unable to create shop:", submitError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSubmitting) {
          setOpen(nextOpen)
          if (!nextOpen) setError(null)
        }
      }}
    >
      {trigger ? (
        trigger(() => setOpen(true))
      ) : (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="h-10 gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
        >
          <Plus aria-hidden="true" className="size-4" />
          Add shop
        </Button>
      )}

      <SheetContent
        side="right"
        className="flex h-dvh w-full max-w-xl flex-col gap-0 overflow-hidden border-l border-red-100 p-0 sm:max-w-xl"
        showCloseButton={!isSubmitting}
      >
        <form
          onSubmit={handleSubmit}
          className="relative flex h-full min-h-0 flex-col overflow-hidden"
        >
          <SheetHeader className="flex-none shrink-0 border-b border-red-100 bg-red-50/60 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
                <Store aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <SheetTitle className="text-base font-bold text-slate-900">
                  Create a shop
                </SheetTitle>
                <SheetDescription className="mt-1 text-xs text-slate-600">
                  Add shop contact details and optional photos.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="relative min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
              >
                {error}
              </p>
            ) : null}

            <div className="space-y-1.5">
              <label
                htmlFor="new-shop-name"
                className="block text-xs font-semibold text-slate-700"
              >
                Shop name <span className="text-red-600">*</span>
              </label>
              <Input
                id="new-shop-name"
                name="name"
                autoComplete="organization"
                required
                maxLength={255}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter shop name"
                className={FIELD_CLASS}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="new-shop-owner"
                className="block text-xs font-semibold text-slate-700"
              >
                Owner name <span className="text-red-600">*</span>
              </label>
              <Input
                id="new-shop-owner"
                name="owner"
                autoComplete="name"
                required
                maxLength={255}
                value={owner}
                onChange={(event) => setOwner(event.target.value)}
                placeholder="Enter owner name"
                className={FIELD_CLASS}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="new-shop-phone"
                className="block text-xs font-semibold text-slate-700"
              >
                Phone number <span className="text-red-600">*</span>
              </label>
              <PhoneInput
                country="lk"
                value={phone}
                onChange={setPhone}
                inputProps={{
                  id: "new-shop-phone",
                  name: "phone_number",
                  autoComplete: "tel",
                  required: true,
                  "aria-label": "Shop phone number",
                }}
                placeholder="+94 77 123 4567"
                containerClass="shop-phone w-full"
                inputClass="!h-10 !w-full !rounded-lg !border-slate-200 !bg-white !pl-[48px] !text-sm !text-slate-900 !shadow-none focus:!border-red-400 focus:!ring-2 focus:!ring-red-100"
                buttonClass="!rounded-l-lg !border-slate-200 !bg-white hover:!bg-red-50"
                dropdownClass="!rounded-lg !text-sm [&_.country]:!text-slate-700 [&_.country:hover]:!text-slate-700 [&_.country.highlight]:!text-slate-700"
                enableSearch
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="new-shop-email"
                className="block text-xs font-semibold text-slate-700"
              >
                Email{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <Input
                id="new-shop-email"
                name="email"
                type="email"
                autoComplete="email"
                maxLength={255}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="shop@example.com"
                className={FIELD_CLASS}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="new-shop-address"
                className="block text-xs font-semibold text-slate-700"
              >
                Address <span className="text-red-600">*</span>
              </label>
              <Textarea
                id="new-shop-address"
                name="address1"
                autoComplete="street-address"
                required
                maxLength={255}
                value={address1}
                onChange={(event) => setAddress1(event.target.value)}
                placeholder="Street address, building, or location"
                className="min-h-20 resize-y rounded-lg border-slate-200 text-sm focus-visible:border-red-400 focus-visible:ring-red-100"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="new-shop-area"
                className="block text-xs font-semibold text-slate-700"
              >
                Area <span className="text-red-600">*</span>
              </label>
              <Input
                id="new-shop-area"
                name="area"
                required
                maxLength={255}
                value={area}
                onChange={(event) => setArea(event.target.value)}
                placeholder="Enter area or town"
                className={FIELD_CLASS}
              />
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-xs font-semibold text-slate-700">
                  Shop images{" "}
                  <span className="font-normal text-slate-400">(optional)</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Select multiple image files.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label
                  htmlFor="new-shop-images"
                  className={UPLOAD_LABEL_CLASS}
                >
                  <ImagePlus
                    aria-hidden="true"
                    className="size-4 shrink-0 text-red-600"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Choose images
                  </span>
                  <input
                    id="new-shop-images"
                    name="images"
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                      const selectedFiles = Array.from(
                        event.currentTarget.files ?? []
                      )
                      setPreviews((current) => [
                        ...current,
                        ...selectedFiles.map((file) => ({
                          file,
                          url: URL.createObjectURL(file),
                        })),
                      ])
                      event.currentTarget.value = ""
                    }}
                  />
                </label>
                <label
                  htmlFor="new-shop-camera"
                  className={UPLOAD_LABEL_CLASS}
                >
                  <Camera
                    aria-hidden="true"
                    className="size-4 shrink-0 text-red-600"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Take a photo
                  </span>
                  <input
                    id="new-shop-camera"
                    name="camera-image"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0]
                      if (file) {
                        setPreviews((current) => [
                          ...current,
                          { file, url: URL.createObjectURL(file) },
                        ])
                      }
                      event.currentTarget.value = ""
                    }}
                  />
                </label>
              </div>

              {previews.length > 0 ? (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {previews.map(({ file, url }, index) => (
                    <li
                      key={`${file.name}-${file.lastModified}-${index}`}
                      className="group relative aspect-[4/3] overflow-hidden border border-slate-200 bg-slate-50"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={file.name}
                        className="size-full object-cover"
                      />
                      <button
                        type="button"
                        aria-label={`Remove ${file.name}`}
                        onClick={() => removeImage(file)}
                        className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-sm transition hover:bg-red-600 hover:text-white"
                      >
                        <Trash2 aria-hidden="true" className="size-3.5" />
                      </button>
                      <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-2 py-1 text-left text-[10px] text-white">
                        {file.name}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

          <SheetFooter className="mt-0 h-auto flex-none shrink-0 flex-row items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3 sm:px-6">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setOpen(false)}
              className="h-10 shrink-0 rounded-lg border-slate-200 px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 shrink-0 gap-2 rounded-lg bg-red-600 px-5 text-white hover:bg-red-700"
            >
              {isSubmitting ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
              ) : (
                <Upload aria-hidden="true" className="size-4" />
              )}
              {isSubmitting ? "Adding shop..." : "Add shop"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}