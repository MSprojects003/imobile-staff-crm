"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ImageOff,
  Package,
  Store,
} from "lucide-react"
import { format } from "date-fns"

import { SubOrderItemStatusSelect } from "@/components/custom/orders/details/status-select"
import { useSidebar } from "@/components/ui/sidebar"

export type OrderDetailVariant = {
  id: string | null
  models: string[]
  colors: string[]
  quantity: number
  unitPrice: number
  subtotal: number
  status: string
}

export type OrderDetailProduct = {
  id: string
  productId: string | null
  name: string
  image: string | null
  quantity: number
  subtotal: number
  status: string
  variants: OrderDetailVariant[]
}

export type OrderDetailData = {
  id: string
  orderId: string
  createdAt: string
  shopId: string
  shopName: string
  productsCount: number
  parcelsDelivered: number
  status: string
  estimatedTotal: number
  deductedAmount: number
  refundAmount: number
  totalAmount: number
  isNegotiablePrice: boolean
  negotiableReason: string | null
  products: OrderDetailProduct[]
}

function formatCurrency(value: number) {
  return `Rs. ${value.toLocaleString("en-LK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : format(date, "dd MMM yyyy, hh:mm a")
}

function formatStatus(status: string) {
  return status
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function getStatusClass(status: string) {
  switch (status.toLowerCase()) {
    case "accepted":
    case "delivered":
      return "border-emerald-200 bg-emerald-50 text-emerald-700"
    case "packing":
      return "border-violet-200 bg-violet-50 text-violet-700"
    case "processing":
      return "border-blue-200 bg-blue-50 text-blue-700"
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700"
    default:
      return "border-amber-200 bg-amber-50 text-amber-700"
  }
}

function getItemStatusClass(status: string) {
  switch (status) {
    case "packing":
      return "bg-violet-50 text-violet-700"
    case "processing":
      return "bg-blue-50 text-blue-700"
    default:
      return "bg-slate-100 text-slate-600"
  }
}

function getSelections(variant: OrderDetailVariant) {
  return [
    ...variant.models.map((model) => ({ type: "Model", value: model })),
    ...variant.colors.map((color) => ({ type: "Color", value: color })),
  ].filter((selection) => selection.value.trim())
}

function PaymentSummaryBreakdown({ order }: { order: OrderDetailData }) {
  return (
    <>
      <h2 className="text-sm font-bold text-slate-900">Payment summary</h2>
      <dl className="mt-3 space-y-2.5 text-sm">
        <div className="flex items-center justify-between gap-3 text-slate-600">
          <dt>Items subtotal</dt>
          <dd className="font-medium text-slate-900 tabular-nums">
            {formatCurrency(order.estimatedTotal)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 text-slate-600">
          <dt>Negotiated deduction</dt>
          <dd className="font-medium text-slate-900 tabular-nums">
            −{formatCurrency(order.deductedAmount)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 text-slate-600">
          <dt>No-items refund</dt>
          <dd className="font-medium text-slate-900 tabular-nums">
            −{formatCurrency(order.refundAmount)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-red-100 pt-3">
          <dt className="font-semibold text-slate-900">Total payable</dt>
          <dd className="text-lg font-bold text-red-700 tabular-nums">
            {formatCurrency(order.totalAmount)}
          </dd>
        </div>
      </dl>
    </>
  )
}

export function OrderItemsTable({ order }: { order: OrderDetailData }) {
  const [isPaymentSummaryExpanded, setIsPaymentSummaryExpanded] =
    useState(false)
  const { state: sidebarState } = useSidebar()

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <Link
        href="/orders"
        className="inline-flex h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium text-red-700 transition hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to orders
      </Link>

      <header className="overflow-hidden rounded-2xl border border-red-100 bg-white shadow-sm">
        <div className="flex flex-col gap-4 bg-gradient-to-r from-red-50 via-white to-white p-4 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.14em] text-red-600 uppercase">
              Order details
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                {order.orderId}
              </h1>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(order.status)}`}
              >
                {formatStatus(order.status)}
              </span>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
              <CalendarDays aria-hidden="true" className="size-4" />
              {formatDate(order.createdAt)}
            </p>
          </div>
          <div className="rounded-xl border border-red-100 bg-white/90 px-4 py-3 lg:min-w-52 lg:text-right">
            <p className="text-xs font-medium text-slate-500">Total payable</p>
            <p className="mt-1 text-xl font-bold text-red-700 tabular-nums">
              {formatCurrency(order.totalAmount)}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 border-t border-red-100 p-4 sm:grid-cols-3 sm:gap-4 sm:p-5">
          <div className="min-w-0 rounded-lg bg-slate-50 p-3">
            <dt className="flex items-center gap-1.5 text-xs text-slate-500">
              <Store aria-hidden="true" className="size-3.5" />
              Shop
            </dt>
            <dd className="mt-1 truncate text-sm font-semibold text-slate-900">
              <Link
                href={`/shops/${order.shopId}`}
                aria-label={`View shop ${order.shopName}`}
                className="text-red-700 underline-offset-4 transition hover:text-red-900 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              >
                {order.shopName}
              </Link>
            </dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="text-xs text-slate-500">Products</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
              {order.productsCount}
            </dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="text-xs text-slate-500">Parcels delivered</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
              {order.parcelsDelivered}
            </dd>
          </div>
        </dl>
      </header>

      {order.isNegotiablePrice && order.negotiableReason ? (
        <aside className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-semibold text-amber-900">
            Negotiable pricing note
          </p>
          <p className="mt-1 text-sm text-amber-800">
            {order.negotiableReason}
          </p>
        </aside>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-red-100 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-red-100 px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Order items</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Products and selected models or colors
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
            <Package aria-hidden="true" className="size-3.5" />
            {order.products.length}{" "}
            {order.products.length === 1 ? "product" : "products"}
          </span>
        </div>

        {order.products.length > 0 ? (
          <ul className="divide-y divide-red-100">
            {order.products.map((product) => {
              const variants =
                product.variants.length > 0
                  ? product.variants
                  : [
                      {
                        id: null,
                        models: [],
                        colors: [],
                        quantity: product.quantity,
                        unitPrice:
                          product.quantity > 0
                            ? product.subtotal / product.quantity
                            : product.subtotal,
                        subtotal: product.subtotal,
                        status: product.status,
                      },
                    ]
              const itemSubtotal = variants.reduce(
                (total, variant) => total + variant.subtotal,
                0
              )
              const itemRefund = variants.reduce(
                (total, variant) =>
                  total +
                  (variant.status === "no_items" ? variant.subtotal : 0),
                0
              )
              const itemPayable = itemSubtotal - itemRefund

              return (
                <li key={product.id} className="p-3 sm:p-5">
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    {product.productId ? (
                      <Link
                        href={`/products/${product.productId}`}
                        aria-label={`View product ${product.name}`}
                        className="relative size-[4.5rem] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition hover:border-red-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:size-20"
                      >
                        {product.image?.trim() ? (
                          <Image
                            src={product.image.trim()}
                            alt=""
                            fill
                            unoptimized
                            sizes="(max-width: 640px) 72px, 80px"
                            className="object-contain p-1.5"
                          />
                        ) : (
                          <span className="flex size-full items-center justify-center text-slate-300">
                            <ImageOff aria-hidden="true" className="size-6" />
                          </span>
                        )}
                      </Link>
                    ) : (
                      <div className="relative size-[4.5rem] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 sm:size-20">
                        {product.image?.trim() ? (
                          <Image
                            src={product.image.trim()}
                            alt=""
                            fill
                            unoptimized
                            sizes="(max-width: 640px) 72px, 80px"
                            className="object-contain p-1.5"
                          />
                        ) : (
                          <span className="flex size-full items-center justify-center text-slate-300">
                            <ImageOff aria-hidden="true" className="size-6" />
                          </span>
                        )}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-sm leading-5 font-semibold text-slate-900 sm:text-base">
                        {product.productId ? (
                          <Link
                            href={`/products/${product.productId}`}
                            className="rounded-sm transition hover:text-red-700 hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                          >
                            {product.name}
                          </Link>
                        ) : (
                          product.name
                        )}
                      </h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${getItemStatusClass(product.status)}`}
                        >
                          {formatStatus(product.status)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {product.quantity}{" "}
                          {product.quantity === 1 ? "unit" : "units"}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right tabular-nums">
                      <p className="text-sm font-bold text-slate-900 sm:text-base">
                        {formatCurrency(itemPayable)}
                      </p>
                      {itemRefund > 0 ? (
                        <p className="mt-0.5 text-[10px] font-medium text-red-600">
                          {formatCurrency(itemRefund)} refunded
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 space-y-2 sm:mt-4 sm:ml-[6rem]">
                    {variants.map((variant, index) => {
                      const selections = getSelections(variant)
                      return (
                        <div
                          key={`${product.id}-${index}`}
                          className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4"
                        >
                          <div className="min-w-0">
                            {selections.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {selections.map((selection, selectionIndex) => (
                                  <span
                                    key={`${selection.type}-${selection.value}-${selectionIndex}`}
                                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                                  >
                                    <span className="text-slate-500">
                                      {selection.type}:
                                    </span>
                                    <span className="font-medium">
                                      {selection.value}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500">
                                Standard selection
                              </span>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                              {variant.id ? (
                                <SubOrderItemStatusSelect
                                  itemId={variant.id}
                                  initialStatus={variant.status}
                                />
                              ) : (
                                <span
                                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getItemStatusClass(variant.status)}`}
                                >
                                  {formatStatus(variant.status)}
                                </span>
                              )}
                              <span className="text-xs text-slate-500">
                                Qty{" "}
                                <span className="font-semibold text-slate-700 tabular-nums">
                                  {variant.quantity}
                                </span>
                              </span>
                              <span className="text-xs text-slate-500 tabular-nums">
                                {formatCurrency(variant.unitPrice)} / unit
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2 sm:min-w-32 sm:flex-col sm:items-end sm:justify-center sm:border-0 sm:pt-0">
                            <span className="text-xs text-slate-500 sm:hidden">
                              Line total
                            </span>
                            <div className="text-right tabular-nums">
                              <p
                                className={`text-sm ${
                                  variant.status === "no_items"
                                    ? "text-slate-400 line-through"
                                    : "font-semibold text-slate-900"
                                }`}
                              >
                                {formatCurrency(
                                  variant.status === "no_items"
                                    ? 0
                                    : variant.subtotal
                                )}
                              </p>
                              {variant.status === "no_items" ? (
                                <p className="text-[10px] font-medium text-red-600">
                                  {formatCurrency(variant.subtotal)} refunded
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="px-4 py-10 text-center">
            <Package
              aria-hidden="true"
              className="mx-auto size-7 text-slate-300"
            />
            <p className="mt-2 text-sm font-medium text-slate-700">
              No item details available
            </p>
          </div>
        )}
      </section>

      <section
        aria-label="Order total breakdown"
        className={`fixed inset-x-0 bottom-0 z-30 flex flex-col border border-red-100 bg-white shadow-[0_-12px_32px_rgba(127,29,29,0.12)] transition-[left,height] duration-300 ease-out motion-reduce:transition-none md:right-0 ${
          sidebarState === "expanded" ? "md:left-56" : "md:left-12"
        } ${
          isPaymentSummaryExpanded
            ? "h-[min(16rem,70dvh)]"
            : "h-[calc(5rem+env(safe-area-inset-bottom))]"
        }`}
      >
        <div
          className={`grid min-h-0 flex-1 transition-[grid-template-rows,visibility] duration-500 ease-out motion-reduce:transition-none ${
            isPaymentSummaryExpanded
              ? "visible grid-rows-[1fr]"
              : "invisible grid-rows-[0fr]"
          }`}
        >
          <div className="min-h-0 overflow-y-auto overscroll-contain p-4 pt-[max(1rem,env(safe-area-inset-top))]">
            <div className="mx-auto w-full max-w-6xl">
              <PaymentSummaryBreakdown order={order} />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 border-t border-red-100 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
            <button
              type="button"
              aria-label={
                isPaymentSummaryExpanded
                  ? "Collapse payment summary"
                  : "Expand payment summary"
              }
              aria-expanded={isPaymentSummaryExpanded}
              onClick={() =>
                setIsPaymentSummaryExpanded((expanded) => !expanded)
              }
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {isPaymentSummaryExpanded ? (
                <ChevronDown aria-hidden="true" className="size-5" />
              ) : (
                <ChevronUp aria-hidden="true" className="size-5" />
              )}
            </button>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-900">
                Final price
              </span>
              <span className="truncate text-lg font-bold text-red-700 tabular-nums">
                {formatCurrency(order.totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
