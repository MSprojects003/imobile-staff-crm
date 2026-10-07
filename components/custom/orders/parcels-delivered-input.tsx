"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, LoaderCircle, Pencil, X } from "lucide-react"

export function ParcelsDeliveredInput({
  orderId,
  initialValue,
}: {
  orderId: string
  initialValue: number
}) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(String(initialValue))
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const cancelEdit = () => {
    setValue(String(initialValue))
    setErrorMessage("")
    setIsEditing(false)
  }

  const save = async () => {
    const parcelsDelivered = Number(value)
    if (!Number.isSafeInteger(parcelsDelivered) || parcelsDelivered < 0) {
      setErrorMessage("Enter a whole number of zero or more.")
      return
    }
    if (parcelsDelivered === initialValue) {
      setIsEditing(false)
      setErrorMessage("")
      return
    }

    setIsSaving(true)
    setErrorMessage("")
    try {
      const response = await fetch(`/api/orders/${orderId}/parcels`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parcelsDelivered }),
      })
      const result = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(result.error ?? "Unable to update delivered parcels.")
      }

      setIsEditing(false)
      router.refresh()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to update delivered parcels."
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (!isEditing) {
    return (
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          aria-label={`Edit parcels delivered for order`}
          className="inline-flex min-w-10 items-center justify-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-slate-700 tabular-nums transition hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
        >
          {initialValue}
          <Pencil aria-hidden="true" className="size-3 text-slate-400" />
        </button>
        {errorMessage ? (
          <p
            role="alert"
            className="mt-1 max-w-36 text-center text-xs text-red-600"
          >
            {errorMessage}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex min-w-24 flex-col items-center gap-1">
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          autoFocus
          aria-label="Parcels delivered"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void save()
            if (event.key === "Escape") cancelEdit()
          }}
          disabled={isSaving}
          className="h-8 w-16 rounded-md border border-slate-200 px-2 text-center text-sm tabular-nums focus:border-red-400 focus:ring-2 focus:ring-red-100 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={isSaving}
          aria-label="Save parcels delivered"
          className="inline-flex size-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
        >
          {isSaving ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Check aria-hidden="true" className="size-4" />
          )}
        </button>
        <button
          type="button"
          onClick={cancelEdit}
          disabled={isSaving}
          aria-label="Cancel parcel count edit"
          className="inline-flex size-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
      {errorMessage ? (
        <p role="alert" className="max-w-36 text-center text-xs text-red-600">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
