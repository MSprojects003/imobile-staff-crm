"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { format, isAfter, isBefore, startOfDay } from "date-fns"
import { Popover } from "@base-ui/react/popover"
import type { DateRange } from "react-day-picker"
import { CalendarDays, Check, Clock3, MapPin, Store, X } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { AssignedWorkDialog } from "@/components/custom/assign-work/dialog"
import type { AssignedWork } from "@/components/custom/assign-work/types"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { FooterPagination } from "@/components/custom/dashboard/Footer-pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const PAGE_SIZE = 10
const PROGRESS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
] as const

const navButtonClass =
  "inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white p-0 text-slate-600 shadow-none transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 aria-disabled:pointer-events-none aria-disabled:opacity-40 [&_svg]:size-4"

const calendarClassNames = {
  nav: "absolute inset-x-0 top-0 z-10 flex h-9 items-center justify-between",
  button_previous: navButtonClass,
  button_next: navButtonClass,
  month: "flex w-full flex-col gap-3",
  month_caption: "flex h-9 items-center justify-center px-11",
  caption_label: "text-sm font-semibold text-slate-900",
}

function parseDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function dateToQueryValue(date: Date | undefined) {
  return date ? format(date, "yyyy-MM-dd") : null
}

function formatProgress(progress: string) {
  return progress.charAt(0).toUpperCase() + progress.slice(1)
}

function progressStyle(progress: string) {
  switch (progress.toLowerCase()) {
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700"
    case "pending":
      return "border-slate-200 bg-slate-100 text-slate-600"
    default:
      return "border-amber-200 bg-amber-50 text-amber-700"
  }
}

export function filterAssignedWorks(
  works: AssignedWork[],
  status: string,
  startDate?: Date,
  endDate?: Date
) {
  return works.filter((work) => {
    if (status !== "all" && work.progress.toLowerCase() !== status) return false
    const createdAt = new Date(work.createdAt)
    if (startDate && isBefore(createdAt, startOfDay(startDate))) return false
    if (
      endDate &&
      isAfter(
        createdAt,
        new Date(
          endDate.getFullYear(),
          endDate.getMonth(),
          endDate.getDate(),
          23,
          59,
          59,
          999
        )
      )
    ) {
      return false
    }
    return true
  })
}

export function AssignedWorkPagination({ works }: { works: AssignedWork[] }) {
  const searchParams = useSearchParams()
  const filteredWorks = filterAssignedWorks(
    works,
    searchParams.get("progress") ?? "all",
    parseDate(searchParams.get("start")),
    parseDate(searchParams.get("end"))
  )
  const totalPages = Math.max(1, Math.ceil(filteredWorks.length / PAGE_SIZE))
  const currentPage = Math.min(
    Math.max(Number.parseInt(searchParams.get("page") ?? "1", 10) || 1, 1),
    totalPages
  )

  return (
    <FooterPagination
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={filteredWorks.length}
      pageSize={PAGE_SIZE}
      itemLabel="assigned works"
      ariaLabel="Assigned work pages"
      hideAtBottom={false}
      className="border-slate-200 bg-white/95"
    />
  )
}

export function AssignedWorkTable({ works }: { works: AssignedWork[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const progressFilter = searchParams.get("progress") ?? "all"
  const startDate = parseDate(searchParams.get("start"))
  const endDate = parseDate(searchParams.get("end"))
  const range: DateRange | undefined =
    startDate || endDate ? { from: startDate, to: endDate } : undefined
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false)
  const [selectedWork, setSelectedWork] = useState<AssignedWork | null>(null)
  const [dialogProgress, setDialogProgress] = useState("ongoing")
  const [savingWorkId, setSavingWorkId] = useState<string | null>(null)
  const [progressOverrides, setProgressOverrides] = useState<
    Record<string, string>
  >({})
  const [saveError, setSaveError] = useState<string | null>(null)

  const visibleWorks = useMemo(
    () =>
      filterAssignedWorks(
        works.map((work) => ({
          ...work,
          progress: progressOverrides[work.id] ?? work.progress,
        })),
        progressFilter,
        startDate,
        endDate
      ),
    [endDate, progressFilter, progressOverrides, startDate, works]
  )
  const totalPages = Math.max(1, Math.ceil(visibleWorks.length / PAGE_SIZE))
  const page = Math.min(
    Math.max(Number.parseInt(searchParams.get("page") ?? "1", 10) || 1, 1),
    totalPages
  )
  const pageWorks = visibleWorks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const dateLabel =
    startDate || endDate
      ? `${startDate ? format(startDate, "dd MMM yyyy") : "Start"} – ${
          endDate ? format(endDate, "dd MMM yyyy") : "End"
        }`
      : "All dates"
  const hasFilters = progressFilter !== "all" || Boolean(startDate || endDate)

  const updateQuery = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  useEffect(() => {
    const requestedPage = Number.parseInt(searchParams.get("page") ?? "1", 10)
    if (requestedPage >= 1 && requestedPage <= totalPages) return
    const nextPage = Math.min(Math.max(requestedPage || 1, 1), totalPages)
    updateQuery({ page: String(nextPage) })
  }, [searchParams, totalPages, updateQuery])

  function handleRangeChange(nextRange: DateRange | undefined) {
    updateQuery({
      start: dateToQueryValue(nextRange?.from),
      end: dateToQueryValue(nextRange?.to),
      page: "1",
    })
  }

  async function updateProgress(work: AssignedWork, nextProgress: string) {
    const currentProgress = progressOverrides[work.id] ?? work.progress
    if (currentProgress === nextProgress || savingWorkId) return
    setSaveError(null)
    setSavingWorkId(work.id)
    try {
      const response = await fetch(`/api/assign-work/${work.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: nextProgress }),
      })
      const result = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(result.error ?? "Unable to update work progress.")
      }
      setProgressOverrides((current) => ({
        ...current,
        [work.id]: nextProgress,
      }))
      setDialogProgress(nextProgress)
      router.refresh()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update work progress."
      setSaveError(message)
      console.error("Unable to update assigned work progress:", error)
    } finally {
      setSavingWorkId(null)
    }
  }

  function openWork(work: AssignedWork) {
    const currentWork = {
      ...work,
      progress: progressOverrides[work.id] ?? work.progress,
    }
    setSelectedWork(currentWork)
    setDialogProgress(currentWork.progress)
    setSaveError(null)
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4 pb-8 sm:space-y-5">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-red-600 uppercase">
            Staff workspace
          </p>
          <span
            aria-hidden="true"
            className="block h-0.5 w-10 rounded-full bg-[#e7242b]"
          />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          My Works
        </h1>
        <p className="text-xs text-slate-600 sm:text-sm">
          Review assigned work and keep progress up to date.
        </p>
      </header>

      <section
        aria-label="Filter assigned works"
        className="grid grid-cols-1 gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2 lg:flex lg:items-end"
      >
        <label className="min-w-0 space-y-1.5 lg:w-52">
          <span className="block text-xs font-semibold text-slate-600">
            Progress
          </span>
          <Select
            value={progressFilter}
            onValueChange={(value) =>
              updateQuery({
                progress: value === "all" ? null : value,
                page: "1",
              })
            }
          >
            <SelectTrigger
              aria-label="Filter by progress"
              className="h-10 w-full rounded-lg border-slate-200 bg-white text-xs"
            >
              <SelectValue>
                {progressFilter === "all"
                  ? "All progress"
                  : formatProgress(progressFilter)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All progress</SelectItem>
              {PROGRESS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <div className="min-w-0 space-y-1.5 lg:w-72">
          <span className="block text-xs font-semibold text-slate-600">
            Assigned date
          </span>
          <Popover.Root
            open={isDateFilterOpen}
            onOpenChange={setIsDateFilterOpen}
          >
            <Popover.Trigger className="flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-xs text-slate-700 transition hover:bg-red-50/50">
              <CalendarDays
                aria-hidden="true"
                className="size-4 shrink-0 text-red-600"
              />
              <span className="truncate">{dateLabel}</span>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner
                side="bottom"
                align="start"
                sideOffset={6}
                collisionPadding={12}
                className="z-50"
              >
                <Popover.Popup className="flex max-h-[calc(100dvh-3rem)] w-[calc(100vw-1.5rem)] max-w-fit flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.18)] outline-none sm:w-auto">
                  <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-5">
                    <p className="text-sm font-semibold text-slate-900">
                      Filter by assigned date
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Choose a start and end date.
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                          Start date
                        </p>
                        <p className="mt-0.5 truncate text-xs font-medium text-slate-800">
                          {startDate
                            ? format(startDate, "dd MMM yyyy")
                            : "Select date"}
                        </p>
                      </div>
                      <div className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                          End date
                        </p>
                        <p className="mt-0.5 truncate text-xs font-medium text-slate-800">
                          {endDate
                            ? format(endDate, "dd MMM yyyy")
                            : "Select date"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="min-h-0 overflow-y-auto p-3 sm:p-4">
                    <div className="md:hidden">
                      <Calendar
                        mode="range"
                        selected={range}
                        onSelect={handleRangeChange}
                        numberOfMonths={1}
                        defaultMonth={startDate}
                        classNames={{
                          ...calendarClassNames,
                          months: "relative flex flex-col",
                        }}
                        className="mx-auto p-0"
                      />
                    </div>
                    <div className="hidden md:block">
                      <Calendar
                        mode="range"
                        selected={range}
                        onSelect={handleRangeChange}
                        numberOfMonths={2}
                        defaultMonth={startDate}
                        classNames={{
                          ...calendarClassNames,
                          months: "relative flex flex-row gap-8",
                        }}
                        className="mx-auto p-0"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-3 py-3 sm:px-4">
                    <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-slate-500">
                      <CalendarDays
                        aria-hidden="true"
                        className="size-3.5 shrink-0 text-red-600"
                      />
                      {startDate || endDate
                        ? dateLabel
                        : "No date range selected"}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!startDate && !endDate}
                        onClick={() =>
                          updateQuery({ start: null, end: null, page: "1" })
                        }
                        className="h-8 rounded-lg px-3 text-xs"
                      >
                        Clear
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setIsDateFilterOpen(false)}
                        className="h-8 rounded-lg bg-red-600 px-4 text-xs text-white shadow-sm hover:bg-red-700"
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </div>

        <div className="flex items-end lg:ml-auto">
          <Button
            type="button"
            variant="outline"
            disabled={!hasFilters}
            onClick={() =>
              updateQuery({
                progress: null,
                start: null,
                end: null,
                page: "1",
              })
            }
            className="h-10 w-full gap-1.5 rounded-lg border-red-200 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:text-slate-400 sm:w-auto"
          >
            <X aria-hidden="true" className="size-4" />
            Clear filters
          </Button>
        </div>
      </section>

      {saveError ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {saveError}
        </p>
      ) : null}

      <div className="flex items-center justify-between text-xs text-slate-500">
        <p>
          Showing {visibleWorks.length} of {works.length}{" "}
          {works.length === 1 ? "assignment" : "assignments"}
        </p>
      </div>

      {visibleWorks.length ? (
        <>
          <div className="space-y-3 md:hidden">
            {pageWorks.map((work) => (
              <article
                key={work.id}
                role="button"
                tabIndex={0}
                aria-label={`View assignment for ${work.shopName}`}
                aria-haspopup="dialog"
                onClick={() => openWork(work)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    openWork(work)
                  }
                }}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-red-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                    <Store aria-hidden="true" className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-semibold text-slate-900">
                      {work.shopName}
                    </h2>
                    <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-slate-500">
                      <MapPin aria-hidden="true" className="size-3 shrink-0" />
                      {work.shopArea || "Area not provided"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${progressStyle(
                      progressOverrides[work.id] ?? work.progress
                    )}`}
                  >
                    <span className="size-1.5 rounded-full bg-current" />
                    {formatProgress(
                      progressOverrides[work.id] ?? work.progress
                    )}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-600">
                  {work.message?.trim() || "No message was provided."}
                </p>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <span className="flex min-w-0 items-center gap-1.5 text-[10px] text-slate-500">
                    <Clock3 aria-hidden="true" className="size-3.5 shrink-0" />
                    <span className="truncate">
                      {format(new Date(work.createdAt), "dd MMM yyyy, h:mm a")}
                    </span>
                  </span>
                  <Select
                    value={progressOverrides[work.id] ?? work.progress}
                    onValueChange={(value) => {
                      if (value) void updateProgress(work, value)
                    }}
                    disabled={savingWorkId === work.id}
                  >
                    <SelectTrigger
                      aria-label={`Update progress for ${work.shopName}`}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                      className="h-8 w-32 rounded-md border-slate-200 bg-white text-[10px]"
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
                </div>
              </article>
            ))}
          </div>

          <div className="hidden max-h-[calc(100dvh-20rem)] [scrollbar-width:thin] [scrollbar-color:#cbd5e1_#f1f5f9] overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-slate-100">
            <Table className="min-w-[850px] text-xs [&_td]:px-4 [&_td]:py-3 [&_th]:h-10 [&_th]:px-4">
              <TableHeader className="sticky top-0 z-10 bg-slate-50">
                <TableRow>
                  <TableHead>Shop</TableHead>
                  <TableHead>Assigned to</TableHead>
                  <TableHead>Assigned date</TableHead>
                  <TableHead>Work message</TableHead>
                  <TableHead>Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageWorks.map((work) => {
                  const progress = progressOverrides[work.id] ?? work.progress
                  return (
                    <TableRow
                      key={work.id}
                      tabIndex={0}
                      aria-label={`View assignment for ${work.shopName}`}
                      aria-haspopup="dialog"
                      onClick={() => openWork(work)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          openWork(work)
                        }
                      }}
                      className="cursor-pointer focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none focus-visible:ring-inset"
                    >
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                            <Store aria-hidden="true" className="size-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="max-w-48 truncate font-semibold text-slate-900">
                              {work.shopName}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-slate-500">
                              <MapPin aria-hidden="true" className="size-3" />
                              {work.shopArea || "Area not provided"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-slate-600">
                        {work.staffName}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-slate-600">
                        {format(
                          new Date(work.createdAt),
                          "dd MMM yyyy, h:mm a"
                        )}
                      </TableCell>
                      <TableCell className="max-w-72">
                        <p className="line-clamp-2 text-slate-600">
                          {work.message?.trim() || "No message provided"}
                        </p>
                      </TableCell>
                      <TableCell
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${progressStyle(
                              progress
                            )}`}
                          >
                            {progress === "completed" ? (
                              <Check aria-hidden="true" className="size-3" />
                            ) : (
                              <span className="size-1.5 rounded-full bg-current" />
                            )}
                            {formatProgress(progress)}
                          </span>
                          <Select
                            value={progress}
                            onValueChange={(value) => {
                              if (value) void updateProgress(work, value)
                            }}
                            disabled={savingWorkId === work.id}
                          >
                            <SelectTrigger
                              aria-label={`Update progress for ${work.shopName}`}
                              className="h-8 w-32 rounded-md border-slate-200 bg-white text-[10px]"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PROGRESS_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
          <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-red-50 text-red-600">
            <Store aria-hidden="true" className="size-5" />
          </span>
          <p className="mt-3 text-sm font-semibold text-slate-900">
            {works.length
              ? "No assignments match these filters"
              : "No assigned work yet"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {works.length
              ? "Try a different progress status or date range."
              : "Work assigned to you will appear here."}
          </p>
        </div>
      )}

      <AssignedWorkDialog
        work={selectedWork}
        open={selectedWork !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedWork(null)
        }}
        progress={dialogProgress}
        onProgressChange={(nextProgress) => {
          setDialogProgress(nextProgress)
          if (selectedWork) void updateProgress(selectedWork, nextProgress)
        }}
        isSaving={savingWorkId === selectedWork?.id}
        error={saveError}
      />
    </div>
  )
}
