"use client"

import { CalendarClock, MapPin, Store } from "lucide-react"
import { format } from "date-fns"

import type { AssignedWork } from "@/components/custom/assign-work/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const PROGRESS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
] as const

export function AssignedWorkDialog({
  work,
  open,
  onOpenChange,
  progress,
  onProgressChange,
  isSaving,
  error,
}: {
  work: AssignedWork | null
  open: boolean
  onOpenChange: (open: boolean) => void
  progress: string
  onProgressChange: (progress: string) => void
  isSaving: boolean
  error: string | null
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
        {work ? (
          <>
            <DialogHeader className="border-b border-slate-100 bg-slate-50/80 px-5 py-5 pr-12 sm:px-6">
              <p className="text-[10px] font-semibold tracking-[0.16em] text-red-600 uppercase">
                Assigned work
              </p>
              <DialogTitle className="mt-1 text-lg text-slate-900">
                {work.shopName}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-1.5 text-xs">
                <CalendarClock aria-hidden="true" className="size-3.5" />
                Assigned{" "}
                {format(new Date(work.createdAt), "dd MMM yyyy, h:mm a")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2.5 text-xs text-slate-600">
                <Store
                  aria-hidden="true"
                  className="size-4 shrink-0 text-red-600"
                />
                <span className="min-w-0 truncate font-medium text-slate-800">
                  {work.shopName}
                </span>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="truncate">
                  {work.shopArea || "Area not provided"}
                </span>
              </div>
              <section aria-labelledby="assigned-work-message">
                <h3
                  id="assigned-work-message"
                  className="text-xs font-semibold tracking-wide text-slate-500 uppercase"
                >
                  Work details
                </h3>
                <p className="mt-2 min-h-24 rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-sm leading-6 whitespace-pre-wrap text-slate-700">
                  {work.message?.trim() || "No message was provided."}
                </p>
              </section>
              <section aria-labelledby="assigned-work-progress">
                <h3
                  id="assigned-work-progress"
                  className="text-xs font-semibold tracking-wide text-slate-500 uppercase"
                >
                  Progress
                </h3>
                <Select
                  value={progress}
                  onValueChange={(value) => {
                    if (value) onProgressChange(value)
                  }}
                  disabled={isSaving}
                >
                  <SelectTrigger
                    aria-label="Update work progress"
                    className="mt-2 h-10 w-full border-slate-200 bg-white text-sm"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROGRESS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {error ? (
                  <p role="alert" className="mt-2 text-xs text-red-700">
                    {error}
                  </p>
                ) : null}
              </section>
            </div>

            <DialogFooter className="border-t border-slate-100 bg-white px-5 py-3 sm:px-6">
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() => onOpenChange(false)}
                className="h-9 rounded-lg"
              >
                Close
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
