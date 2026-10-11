"use client"

import * as React from "react"
import { LoaderCircle, Target } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export type TargetRecord = {
  month: number
  year: number
  target_amount: number | string
  achieved_amount: number | string
}

const TARGETS_START_YEAR = 2026
const TARGETS_START_MONTH = 10

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const CURRENCY = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

type MonthStatus = "none" | "achieved" | "progress" | "below"

function getStatus(
  hasRecord: boolean,
  target: number,
  achieved: number,
  isCurrentMonth: boolean
): MonthStatus {
  if (!hasRecord || target <= 0) return "none"
  if (achieved >= target) return "achieved"
  return isCurrentMonth ? "progress" : "below"
}

const STATUS_STYLES: Record<MonthStatus, { label: string; className: string }> =
  {
    none: {
      label: "No target",
      className: "bg-slate-100 text-slate-500 ring-slate-200",
    },
    achieved: {
      label: "Achieved",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    },
    progress: {
      label: "In progress",
      className: "bg-sky-50 text-sky-700 ring-sky-100",
    },
    below: {
      label: "Below target",
      className: "bg-amber-50 text-amber-700 ring-amber-100",
    },
  }

function StatusBadge({ status }: { status: MonthStatus }) {
  const { label, className } = STATUS_STYLES[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ring-1 ${className}`}
    >
      {label}
    </span>
  )
}

function getPercent(target: number, achieved: number) {
  return target > 0
    ? Math.min(100, Math.max(0, (achieved / target) * 100))
    : 0
}

function ProgressBar({
  target,
  achieved,
  status,
}: {
  target: number
  achieved: number
  status: MonthStatus
}) {
  const percent = getPercent(target, achieved)
  const color =
    status === "achieved"
      ? "bg-emerald-500"
      : status === "progress"
        ? "bg-sky-500"
        : status === "below"
          ? "bg-amber-500"
          : "bg-slate-300"

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      aria-label="Target progress"
      className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
    >
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

function balanceClass(balance: number) {
  return balance > 0 ? "text-amber-700" : "text-emerald-700"
}

export function MyTargets({
  open,
  onOpenChange,
  records,
  isLoading,
  error,
  onRetry,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  records: TargetRecord[]
  isLoading: boolean
  error: string | null
  onRetry: () => void
}) {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const years = Array.from(
    { length: Math.max(0, currentYear - TARGETS_START_YEAR + 1) },
    (_, index) => currentYear - index
  )
  const [selectedYear, setSelectedYear] = React.useState(
    String(Math.max(TARGETS_START_YEAR, currentYear))
  )
  const selectedYearNumber = Number(selectedYear) || currentYear
  const yearRecords = records.filter(
    (record) => record.year === selectedYearNumber
  )
  const firstMonth =
    selectedYearNumber === TARGETS_START_YEAR ? TARGETS_START_MONTH : 1
  const lastMonth = selectedYearNumber === currentYear ? currentMonth : 12
  const months = Array.from(
    { length: Math.max(0, lastMonth - firstMonth + 1) },
    (_, index) => firstMonth + index
  )
  const recordByMonth = new Map(
    yearRecords.map((record) => [record.month, record])
  )

  const rows = months.map((month) => {
    const record = recordByMonth.get(month)
    const target = Number(record?.target_amount ?? 0)
    const achieved = Number(record?.achieved_amount ?? 0)
    const isCurrentMonth =
      selectedYearNumber === currentYear && month === currentMonth
    return {
      month,
      hasRecord: Boolean(record),
      target,
      achieved,
      balance: target - achieved,
      status: getStatus(Boolean(record), target, achieved, isCurrentMonth),
    }
  })

  const yearTarget = rows.reduce((total, row) => total + row.target, 0)
  const yearAchieved = rows.reduce((total, row) => total + row.achieved, 0)
  const yearBalance = yearTarget - yearAchieved
  const yearPercent = Math.round(getPercent(yearTarget, yearAchieved))

  const lifetimeRecords = records.filter(
    (record) =>
      record.year >= TARGETS_START_YEAR &&
      record.year <= currentYear &&
      (record.year < currentYear || record.month <= currentMonth) &&
      (record.year !== TARGETS_START_YEAR ||
        record.month >= TARGETS_START_MONTH)
  )
  const lifetimeTarget = lifetimeRecords.reduce(
    (total, record) => total + Number(record.target_amount ?? 0),
    0
  )
  const lifetimeAchieved = lifetimeRecords.reduce(
    (total, record) => total + Number(record.achieved_amount ?? 0),
    0
  )
  const lifetimeBalance = lifetimeTarget - lifetimeAchieved
  const lifetimePercent = Math.round(
    getPercent(lifetimeTarget, lifetimeAchieved)
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-dvh w-full flex-col gap-0 overflow-hidden bg-slate-50 p-0 sm:max-w-2xl lg:max-w-3xl"
      >
        <SheetHeader className="border-b border-slate-200 bg-white px-4 py-3.5 pr-12 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700 ring-1 ring-red-100">
              <Target aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0">
              <SheetTitle className="text-sm font-semibold text-slate-900">
                My sales targets
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-500">
                Monthly targets, achieved sales and balance.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:space-y-5 sm:px-6 sm:py-5">
          {/* Lifetime summary */}
          <section
            aria-label="Lifetime summary"
            className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                Lifetime summary
              </h3>
              <span className="text-[11px] font-medium text-slate-500 tabular-nums">
                {lifetimePercent}% achieved
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${lifetimePercent}%` }}
              />
            </div>
            <dl className="mt-3 grid divide-y divide-slate-100 md:grid-cols-3 md:divide-x md:divide-y-0">
              <div className="flex items-center justify-between py-2 md:block md:py-0 md:pr-4">
                <dt className="text-[11px] text-slate-500">Target</dt>
                <dd className="text-xs font-semibold whitespace-nowrap text-slate-900 tabular-nums md:mt-1 md:text-sm">
                  {CURRENCY.format(lifetimeTarget)}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2 md:block md:px-4 md:py-0">
                <dt className="text-[11px] text-slate-500">Completed</dt>
                <dd className="text-xs font-semibold whitespace-nowrap text-emerald-700 tabular-nums md:mt-1 md:text-sm">
                  {CURRENCY.format(lifetimeAchieved)}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2 md:block md:py-0 md:pl-4">
                <dt className="text-[11px] text-slate-500">Balance</dt>
                <dd
                  className={`text-xs font-semibold whitespace-nowrap tabular-nums md:mt-1 md:text-sm ${balanceClass(lifetimeBalance)}`}
                >
                  {CURRENCY.format(lifetimeBalance)}
                </dd>
              </div>
            </dl>
          </section>

          {/* Year filter */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold text-slate-900">
                Monthly breakdown
              </h3>
              <p className="text-[11px] text-slate-500">
                Showing {selectedYearNumber}
              </p>
            </div>
            <Select
              value={selectedYear}
              onValueChange={(value) => setSelectedYear(value ?? "")}
              disabled={isLoading || years.length === 0}
            >
              <SelectTrigger
                aria-label="Filter targets by year"
                className="h-8 w-28 bg-white text-xs"
              >
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem
                    key={year}
                    value={String(year)}
                    className="text-xs"
                  >
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-14 text-xs text-slate-500">
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
              Loading your targets…
            </div>
          ) : error ? (
            <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <p role="alert" className="text-xs text-red-700">
                {error}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={onRetry}
                className="h-8 bg-white text-xs"
              >
                Retry
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-xs text-slate-500">
              No target months are available for this year yet.
            </p>
          ) : (
            <>
              {/* Mobile / small tablet: stacked cards */}
              <ul className="space-y-2.5 md:hidden">
                {rows.map((row) => (
                  <li
                    key={`${selectedYear}-${row.month}`}
                    className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold text-slate-900">
                        {MONTHS[row.month - 1]}
                      </h4>
                      <StatusBadge status={row.status} />
                    </div>
                    <div className="mt-2.5">
                      <ProgressBar
                        target={row.target}
                        achieved={row.achieved}
                        status={row.status}
                      />
                    </div>
                    <dl className="mt-2.5 grid grid-cols-3 gap-2">
                      <div className="min-w-0">
                        <dt className="text-[10px] text-slate-500">Target</dt>
                        <dd className="mt-0.5 text-[11px] font-semibold text-slate-800 tabular-nums">
                          {CURRENCY.format(row.target)}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-[10px] text-slate-500">Achieved</dt>
                        <dd className="mt-0.5 text-[11px] font-semibold text-slate-800 tabular-nums">
                          {CURRENCY.format(row.achieved)}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-[10px] text-slate-500">Balance</dt>
                        <dd
                          className={`mt-0.5 text-[11px] font-semibold tabular-nums ${balanceClass(row.balance)}`}
                        >
                          {CURRENCY.format(row.balance)}
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
                <li className="rounded-xl border border-slate-200 bg-slate-100/70 p-3">
                  <h4 className="text-xs font-semibold text-slate-900">
                    {selectedYearNumber} total
                  </h4>
                  <dl className="mt-2 grid grid-cols-3 gap-2">
                    <div className="min-w-0">
                      <dt className="text-[10px] text-slate-500">Target</dt>
                      <dd className="mt-0.5 text-[11px] font-semibold text-slate-900 tabular-nums">
                        {CURRENCY.format(yearTarget)}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] text-slate-500">Achieved</dt>
                      <dd className="mt-0.5 text-[11px] font-semibold text-slate-900 tabular-nums">
                        {CURRENCY.format(yearAchieved)}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] text-slate-500">Balance</dt>
                      <dd
                        className={`mt-0.5 text-[11px] font-semibold tabular-nums ${balanceClass(yearBalance)}`}
                      >
                        {CURRENCY.format(yearBalance)}
                      </dd>
                    </div>
                  </dl>
                </li>
              </ul>

              {/* Desktop: table */}
              <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
                <table className="w-full min-w-[600px] text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Month
                      </th>
                      <th scope="col" className="px-3 py-3">
                        Status
                      </th>
                      <th scope="col" className="w-32 px-3 py-3">
                        Progress
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3 text-right whitespace-nowrap"
                      >
                        Target
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3 text-right whitespace-nowrap"
                      >
                        Achieved
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-right whitespace-nowrap"
                      >
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr
                        key={`${selectedYear}-${row.month}`}
                        className="transition-colors hover:bg-slate-50/70"
                      >
                        <th
                          scope="row"
                          className="px-4 py-3 text-left align-middle font-medium whitespace-nowrap text-slate-900"
                        >
                          {MONTHS[row.month - 1]}
                        </th>
                        <td className="px-3 py-3 align-middle">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <div className="flex items-center gap-2">
                            <ProgressBar
                              target={row.target}
                              achieved={row.achieved}
                              status={row.status}
                            />
                            <span className="w-8 shrink-0 text-right text-[10px] text-slate-500 tabular-nums">
                              {Math.round(getPercent(row.target, row.achieved))}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right align-middle whitespace-nowrap text-slate-700 tabular-nums">
                          {CURRENCY.format(row.target)}
                        </td>
                        <td className="px-3 py-3 text-right align-middle whitespace-nowrap text-slate-700 tabular-nums">
                          {CURRENCY.format(row.achieved)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right align-middle font-semibold whitespace-nowrap tabular-nums ${balanceClass(row.balance)}`}
                        >
                          {CURRENCY.format(row.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-900">
                    <tr>
                      <th scope="row" className="px-4 py-3 text-left whitespace-nowrap">
                        {selectedYearNumber} total
                      </th>
                      <td className="px-3 py-3" />
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${yearPercent}%` }}
                            />
                          </div>
                          <span className="w-8 shrink-0 text-right text-[10px] font-medium text-slate-500 tabular-nums">
                            {yearPercent}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">
                        {CURRENCY.format(yearTarget)}
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">
                        {CURRENCY.format(yearAchieved)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right whitespace-nowrap tabular-nums ${balanceClass(yearBalance)}`}
                      >
                        {CURRENCY.format(yearBalance)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}