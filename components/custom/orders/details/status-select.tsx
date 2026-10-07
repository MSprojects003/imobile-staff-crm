"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ITEM_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "packing", label: "Packing" },
  { value: "processing", label: "Processing" },
  { value: "no_items", label: "No items" },
] as const

export function SubOrderItemStatusSelect({
  itemId,
  initialStatus,
}: {
  itemId: string
  initialStatus: string
}) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const updateStatus = async (nextStatus: string | null) => {
    if (!nextStatus || nextStatus === status || isSaving) return

    setIsSaving(true)
    setErrorMessage("")
    try {
      const response = await fetch(`/api/order-items/${itemId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      const result = (await response.json()) as {
        error?: string
      }
      if (!response.ok) {
        throw new Error(result.error ?? "Unable to update item status.")
      }

      setStatus(nextStatus)
      router.refresh()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update item status."
      )
    } finally {
      setIsSaving(false)
    }
  }

  const selectedLabel =
    ITEM_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status

  return (
    <div className="min-w-32">
      <Select value={status} onValueChange={updateStatus} disabled={isSaving}>
        <SelectTrigger
          aria-label={`Status for order item`}
          className="h-8 w-full border-slate-200 bg-white text-xs focus-visible:border-red-400 focus-visible:ring-red-100"
        >
          <SelectValue>{selectedLabel}</SelectValue>
          {isSaving ? (
            <LoaderCircle
              aria-hidden="true"
              className="size-3.5 animate-spin text-slate-400"
            />
          ) : null}
        </SelectTrigger>
        <SelectContent className="border-red-100 bg-white">
          {ITEM_STATUS_OPTIONS.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="focus:bg-red-50 data-[highlighted]:bg-red-50"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {errorMessage ? (
        <p role="alert" className="mt-1 max-w-48 text-xs text-red-600">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
