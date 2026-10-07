"use client"

import { useEffect, useMemo, useState } from "react"
import { format, isAfter, isBefore, startOfDay } from "date-fns"
import Link from "next/link"
import Image from "next/image"
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Eye,
  ImageOff,
  Package,
  Search,
  Store,
  UserRound,
  X,
} from "lucide-react"
import { Popover } from "@base-ui/react/popover"
import type { DateRange } from "react-day-picker"

import { Calendar } from "@/components/ui/calendar"
import { ParcelsDeliveredInput } from "@/components/custom/orders/parcels-delivered-input"
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

export type OrderVariant = {
  models: string[]
  colors: string[]
  quantity: number
  unitPrice: number
  subtotal: number
}

export type OrderProduct = {
  id: string
  productId: string | null
  name: string
  image: string | null
  quantity: number
  subtotal: number
  variants: OrderVariant[]
}

export type OrderListItem = {
  id: string
  orderId: string
  createdAt: string
  staffName: string
  shopId: string
  shopName: string
  productsCount: number
  totalAmount: number
  parcelsDelivered: number
  status: string
  products: OrderProduct[]
}

type ShopOption = {
  id: string
  name: string
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "delivered", label: "Delivered" },
  { value: "packing", label: "Packing" },
  { value: "processing", label: "Processing" },
]

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"

function formatCurrency(value: number) {
  return `Rs. ${value.toLocaleString("en-LK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

function formatOrderDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : format(date, "dd MMM yyyy")
}

function formatStatus(status: string) {
  return status
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function getStatusStyles(status: string) {
  switch (status.toLowerCase()) {
    case "accepted":
    case "delivered":
      return {
        badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
        dot: "bg-emerald-500",
        accent: "border-l-emerald-500",
      }
    case "rejected":
      return {
        badge: "border-red-200 bg-red-50 text-red-700",
        dot: "bg-red-500",
        accent: "border-l-red-500",
      }
    case "packing":
      return {
        badge: "border-violet-200 bg-violet-50 text-violet-700",
        dot: "bg-violet-500",
        accent: "border-l-violet-500",
      }
    case "processing":
      return {
        badge: "border-blue-200 bg-blue-50 text-blue-700",
        dot: "bg-blue-500",
        accent: "border-l-blue-500",
      }
    default:
      return {
        badge: "border-amber-200 bg-amber-50 text-amber-700",
        dot: "bg-amber-500",
        accent: "border-l-amber-500",
      }
  }
}

function StatusBadge({ status }: { status: string }) {
  const styles = getStatusStyles(status)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${styles.badge}`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${styles.dot}`}
      />
      {formatStatus(status)}
    </span>
  )
}

function useIsWide(query = "(min-width: 640px)") {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [query])
  return matches
}

export function OrdersTable({
  orders,
  shops,
}: {
  orders: OrderListItem[]
  shops: ShopOption[]
}) {
  const [search, setSearch] = useState("")
  const [shopFilter, setShopFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [range, setRange] = useState<DateRange | undefined>()
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false)
  const isDesktop = useIsWide("(min-width: 1024px)")

  const startDate = range?.from
  const endDate = range?.to

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase()
    return orders.filter((order) => {
      if (shopFilter !== "all" && order.shopId !== shopFilter) return false
      if (
        statusFilter !== "all" &&
        order.status.toLowerCase() !== statusFilter
      ) {
        return false
      }
      if (
        query &&
        !order.orderId.toLowerCase().includes(query) &&
        !order.staffName.toLowerCase().includes(query)
      ) {
        return false
      }
      const createdAt = new Date(order.createdAt)
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
  }, [endDate, orders, search, shopFilter, startDate, statusFilter])

  const selectedShopName =
    shops.find((shop) => shop.id === shopFilter)?.name ?? "All shops"
  const selectedStatusName =
    STATUS_OPTIONS.find((status) => status.value === statusFilter)?.label ??
    "All statuses"

  const hasFilters =
    shopFilter !== "all" ||
    statusFilter !== "all" ||
    search.trim() !== "" ||
    Boolean(startDate || endDate)

  const dateLabel =
    startDate || endDate
      ? `${startDate ? format(startDate, "dd MMM yyyy") : "Start"} – ${
          endDate ? format(endDate, "dd MMM yyyy") : "End"
        }`
      : "Select date range"

  const clearFilters = () => {
    setSearch("")
    setShopFilter("all")
    setStatusFilter("all")
    setRange(undefined)
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4 pb-6 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Orders
        </h1>
        <p className="text-sm text-slate-500">
          Review orders, parcel counts, and fulfillment status.
        </p>
      </div>

      {/* Filters */}
      <section
        aria-label="Filter orders"
        className="rounded-xl border border-red-100 bg-white p-2.5 shadow-sm sm:p-4"
      >
        <div className="grid grid-cols-2 gap-2.5 lg:flex lg:flex-nowrap lg:items-end lg:gap-3">
          <div className="col-span-2 flex min-w-0 items-end gap-2 lg:contents">
            <label className="relative min-w-0 flex-1 space-y-1.5 lg:flex-[1.4] lg:basis-0">
              <span className="text-xs font-semibold text-slate-600">
                Search
              </span>
              <span className="relative block">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Order ID or staff name"
                  aria-label="Search orders by order ID or staff name"
                  className={`h-9 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-red-300 lg:h-10 ${focusRing}`}
                />
              </span>
            </label>

            <button
              type="button"
              aria-label={mobileFiltersOpen ? "Hide filters" : "Show filters"}
              aria-expanded={mobileFiltersOpen}
              aria-controls="orders-filter-options"
              onClick={() => setMobileFiltersOpen((open) => !open)}
              className={`mb-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition-colors hover:bg-red-100 lg:hidden ${focusRing}`}
            >
              <ChevronDown
                aria-hidden="true"
                className={`size-5 transition-transform duration-300 ease-out motion-reduce:transition-none ${
                  mobileFiltersOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          <div
            id="orders-filter-options"
            aria-hidden={!mobileFiltersOpen && !isDesktop}
            inert={!mobileFiltersOpen && !isDesktop}
            className={`col-span-2 grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none lg:flex lg:flex-1 lg:grid-rows-none lg:items-end lg:gap-3 lg:overflow-visible lg:opacity-100 ${
              mobileFiltersOpen ? "grid-rows-[1fr] opacity-100" : ""
            }`}
          >
            <div className="min-h-0 overflow-hidden lg:contents">
              <div className="grid grid-cols-2 gap-2.5 pt-2.5 lg:contents">
                <label className="min-w-0 space-y-1.5 lg:flex-1 lg:basis-0">
                  <span className="text-xs font-semibold text-slate-600">
                    Shop
                  </span>
                  <Select
                    value={shopFilter}
                    onValueChange={(value) => setShopFilter(value ?? "all")}
                  >
                    <SelectTrigger
                      aria-label="Filter orders by shop"
                      className="h-9 w-full border-slate-200 bg-white text-xs focus-visible:border-red-400 focus-visible:ring-red-100 lg:h-10 lg:text-sm"
                    >
                      <SelectValue>{selectedShopName}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="border-red-100 bg-white">
                      <SelectItem
                        value="all"
                        className="focus:bg-red-50 data-[highlighted]:bg-red-50"
                      >
                        All shops
                      </SelectItem>
                      {shops.map((shop) => (
                        <SelectItem
                          key={shop.id}
                          value={shop.id}
                          className="focus:bg-red-50 data-[highlighted]:bg-red-50"
                        >
                          {shop.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <label className="min-w-0 space-y-1.5 lg:flex-1 lg:basis-0">
                  <span className="text-xs font-semibold text-slate-600">
                    Status
                  </span>
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value ?? "all")}
                  >
                    <SelectTrigger
                      aria-label="Filter orders by status"
                      className="h-9 w-full border-slate-200 bg-white text-xs focus-visible:border-red-400 focus-visible:ring-red-100 lg:h-10 lg:text-sm"
                    >
                      <SelectValue>{selectedStatusName}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="border-red-100 bg-white">
                      <SelectItem
                        value="all"
                        className="focus:bg-red-50 data-[highlighted]:bg-red-50"
                      >
                        All statuses
                      </SelectItem>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem
                          key={status.value}
                          value={status.value}
                          className="focus:bg-red-50 data-[highlighted]:bg-red-50"
                        >
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <div className="col-span-2 min-w-0 space-y-1.5 lg:flex-[1.2] lg:basis-0">
                  <span className="block text-xs font-semibold text-slate-600">
                    Date range
                  </span>
                  <Popover.Root
                    open={isDateFilterOpen}
                    onOpenChange={setIsDateFilterOpen}
                  >
                    <Popover.Trigger
                      aria-label="Choose date range"
                      className={`flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border bg-white px-3 text-left text-xs transition hover:bg-red-50/50 lg:h-10 lg:text-sm ${focusRing} ${
                        startDate || endDate
                          ? "border-red-300 text-slate-900"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
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
                        <Popover.Popup className="flex max-h-[calc(100dvh-6rem)] w-fit max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-xl border border-red-100 bg-white shadow-xl outline-none">
                          <div className="overflow-x-hidden overflow-y-auto p-3 sm:p-4">
                            <div className="flex justify-center">
                              <Calendar
                                mode="range"
                                selected={range}
                                onSelect={setRange}
                                numberOfMonths={2}
                                defaultMonth={startDate}
                                classNames={{
                                  months:
                                    "flex flex-col gap-3 md:flex-row md:gap-4",
                                  weekdays: "flex",
                                  weekday:
                                    "w-8 rounded-md text-center text-[0.7rem] font-medium text-slate-500 sm:w-9 sm:text-[0.8rem]",
                                  day_button:
                                    "flex size-8 items-center justify-center rounded-md text-xs text-slate-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 sm:size-9 sm:text-sm",
                                }}
                                className="mx-auto p-1 sm:p-3"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-3 border-t border-red-100 bg-red-50/40 px-3 py-2.5 sm:px-4">
                            <p className="min-w-0 truncate text-xs text-slate-600">
                              {startDate || endDate
                                ? dateLabel
                                : "No dates selected"}
                            </p>
                            <div className="flex shrink-0 items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setRange(undefined)}
                                disabled={!startDate && !endDate}
                                className={`h-8 rounded-md px-3 text-xs font-semibold text-slate-600 transition hover:bg-white disabled:opacity-40 ${focusRing}`}
                              >
                                Clear
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsDateFilterOpen(false)}
                                className={`h-8 rounded-md bg-red-600 px-4 text-xs font-semibold text-white transition hover:bg-red-700 ${focusRing}`}
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        </Popover.Popup>
                      </Popover.Positioner>
                    </Popover.Portal>
                  </Popover.Root>
                </div>

                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!hasFilters}
                  className={`col-span-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 px-4 text-xs font-semibold whitespace-nowrap text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-transparent lg:col-span-1 lg:h-10 lg:w-auto lg:shrink-0 lg:text-sm ${focusRing}`}
                >
                  <X aria-hidden="true" className="size-4" />
                  Clear filters
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Count */}
      <p className="text-sm text-slate-500">
        Showing{" "}
        <span className="font-semibold text-slate-900">
          {filteredOrders.length}
        </span>{" "}
        of {orders.length} orders
      </p>

      {filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-red-200 bg-white px-5 py-14 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-50 text-red-500">
            <Package aria-hidden="true" className="size-6" />
          </span>
          <p className="mt-3 text-sm font-semibold text-slate-900">
            No orders found
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Try changing or clearing the selected filters.
          </p>
          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className={`mt-4 h-9 rounded-lg bg-red-600 px-4 text-xs font-semibold text-white transition hover:bg-red-700 ${focusRing}`}
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-red-100 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <Table className="text-xs [&_td]:px-2 [&_td]:py-2 [&_th]:h-9 [&_th]:px-2">
                <TableHeader className="bg-red-50/70">
                  <TableRow className="border-b border-red-100 hover:bg-red-50/70">
                    <TableHead className="text-xs font-semibold tracking-wide text-red-900 uppercase">
                      Order ID
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wide text-red-900 uppercase">
                      Created
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wide text-red-900 uppercase">
                      Staff
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wide text-red-900 uppercase">
                      Shop
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold tracking-wide text-red-900 uppercase">
                      Products
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold tracking-wide text-red-900 uppercase">
                      Total
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold tracking-wide text-red-900 uppercase">
                      Parcels
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wide text-red-900 uppercase">
                      Status
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold tracking-wide text-red-900 uppercase">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="border-b border-red-50 transition-colors hover:bg-red-50/40"
                    >
                      <TableCell className="font-semibold text-slate-900">
                        {order.orderId}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-slate-600">
                        {formatOrderDate(order.createdAt)}
                      </TableCell>
                      <TableCell className="max-w-40 truncate text-slate-700">
                        {order.staffName}
                      </TableCell>
                      <TableCell className="max-w-44 truncate text-slate-700">
                        {order.shopName}
                      </TableCell>
                      <TableCell className="text-slate-700 tabular-nums">
                        <div className="flex items-center justify-end gap-2">
                          {order.products[0]?.image ? (
                            <span className="relative size-8 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white">
                              <Image
                                src={order.products[0].image}
                                alt={order.products[0].name}
                                fill
                                unoptimized
                                sizes="32px"
                                className="object-contain p-0.5"
                              />
                            </span>
                          ) : (
                            <ImageOff
                              aria-hidden="true"
                              className="size-4 shrink-0 text-slate-300"
                            />
                          )}
                          <span>{order.productsCount}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap text-slate-900 tabular-nums">
                        {formatCurrency(order.totalAmount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <ParcelsDeliveredInput
                          orderId={order.id}
                          initialValue={order.parcelsDelivered}
                        />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/orders/${order.id}`}
                          aria-label={`View order ${order.orderId} details`}
                          title="View details"
                          className={`inline-flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-100 hover:text-red-700 ${focusRing}`}
                        >
                          <Eye aria-hidden="true" className="size-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {filteredOrders.map((order) => (
              <li key={order.id}>
                <article
                  className={`block w-full overflow-hidden rounded-xl border border-l-4 border-red-100 bg-white p-3 text-left shadow-sm ${getStatusStyles(order.status).accent}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {order.orderId}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatOrderDate(order.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>

                  <div className="mt-2.5 space-y-1 text-xs text-slate-600">
                    <p className="flex items-center gap-2">
                      <Store
                        aria-hidden="true"
                        className="size-3.5 shrink-0 text-red-500"
                      />
                      <span className="truncate font-medium text-slate-800">
                        {order.shopName}
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <UserRound
                        aria-hidden="true"
                        className="size-3.5 shrink-0 text-red-500"
                      />
                      <span className="truncate">{order.staffName}</span>
                    </p>
                  </div>

                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-medium text-slate-500">
                        Products
                      </p>
                      <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 tabular-nums">
                        {order.products[0]?.image ? (
                          <span className="relative size-8 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white">
                            <Image
                              src={order.products[0].image}
                              alt={order.products[0].name}
                              fill
                              unoptimized
                              sizes="32px"
                              className="object-contain p-0.5"
                            />
                          </span>
                        ) : (
                          <ImageOff
                            aria-hidden="true"
                            className="size-4 shrink-0 text-slate-300"
                          />
                        )}
                        {order.productsCount}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-medium text-slate-500">
                        Parcels delivered
                      </p>
                      <ParcelsDeliveredInput
                        orderId={order.id}
                        initialValue={order.parcelsDelivered}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-red-100 pt-3">
                    <div>
                      <p className="text-[10px] font-medium text-slate-500">
                        Total amount
                      </p>
                      <p className="text-base font-bold text-red-700 tabular-nums">
                        {formatCurrency(order.totalAmount)}
                      </p>
                    </div>
                    <Link
                      href={`/orders/${order.id}`}
                      aria-label={`View order ${order.orderId} details`}
                      className={`inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 ${focusRing}`}
                    >
                      Details
                      <ChevronRight aria-hidden="true" className="size-4" />
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
