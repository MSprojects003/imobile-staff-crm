"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  LoaderCircle,
  LockKeyhole,
  Plus,
  UserRound,
  X,
} from "lucide-react"

import { CreateShopSheet } from "@/components/custom/dashboard/shops/create-sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createShop, type CreateShopInput } from "@/lib/api/shops"
import { createOrder } from "@/lib/api/orders"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { createSupabaseBrowserClient } from "@/lib/supabase/browser"

import type { CartDisplayItem } from "./cart-items-card"

type ShopOption = {
  id: string
  full_name: string
}

type ShopToast = {
  kind: "success" | "warning"
  title: string
  message: string
}

function formatCurrency(value: number) {
  return `Rs. ${value.toLocaleString("en-LK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

export function SummaryCard({
  items,
  subtotal,
  shops,
  staffName,
  clearCart,
}: {
  items: CartDisplayItem[]
  subtotal: number
  shops: ShopOption[]
  staffName: string
  clearCart: () => void
}) {
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null)
  const [createdShops, setCreatedShops] = useState<ShopOption[]>([])
  const [isPriceNegotiable, setIsPriceNegotiable] = useState(false)
  const [deductionInput, setDeductionInput] = useState("")
  const [deductionReason, setDeductionReason] = useState("")
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false)
  const [supabase] = useState(() => createSupabaseBrowserClient())
  const [shopToast, setShopToast] = useState<ShopToast | null>(null)

  useEffect(() => {
    const channel = supabase
      .channel("shops", { config: { private: true } })
      .on("broadcast", { event: "shop_created" }, ({ payload }) => {
        if (typeof payload !== "object" || payload === null) return
        const broadcast = payload as {
          new?: { id?: unknown; name?: unknown }
        }
        const shop = broadcast.new
        if (typeof shop?.id !== "string" || typeof shop.name !== "string") {
          return
        }

        setCreatedShops((current) => {
          if (current.some((existing) => existing.id === shop.id)) {
            return current
          }
          return [
            ...current,
            { id: shop.id as string, full_name: shop.name as string },
          ]
        })
      })
      .subscribe((status, error) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("Unable to subscribe to shop updates:", error)
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [supabase])

  const itemCount = items.reduce(
    (count, item) => count + item.variants.length,
    0
  )
  const total = subtotal
  const requestedDeduction = isPriceNegotiable
    ? Math.max(0, Number(deductionInput) || 0)
    : 0
  const deduction = Math.min(requestedDeduction, total)
  const finalTotal = total - deduction
  const availableShops = useMemo(
    () => [...shops, ...createdShops],
    [createdShops, shops]
  )
  const selectedShop = useMemo(
    () => availableShops.find((shop) => shop.id === selectedShopId),
    [availableShops, selectedShopId]
  )
  const handleCreateShop = async (input: CreateShopInput) => {
    const newShop = await createShop(input)
    const shopOption = { id: newShop.id, full_name: newShop.name }
    setCreatedShops((current) => [
      ...current.filter((shop) => shop.id !== shopOption.id),
      shopOption,
    ])
    setSelectedShopId(shopOption.id)

    if (newShop.smsDelivery?.failed) {
      const warnings = []
      if (newShop.smsDelivery.adminFailed > 0) {
        warnings.push(
          `Notify.lk failed to send ${newShop.smsDelivery.adminFailed} admin SMS message(s).`
        )
      }
      if (newShop.smsDelivery.shopFailed) {
        warnings.push("Notify.lk failed to send the shop welcome SMS.")
      }
      warnings.push(
        "Contact Notify.lk or upgrade your plan to resolve SMS delivery issues."
      )
      setShopToast({
        kind: "warning",
        title: "Shop created, but SMS delivery failed",
        message: warnings.join(" "),
      })
      return
    }

    setShopToast({
      kind: "success",
      title: "Shop created successfully",
      message: `${newShop.name} has been added. SMS messages were sent.`,
    })
  }
  const handlePlaceOrder = async () => {
    if (!selectedShopId || itemCount === 0 || isCreatingOrder) return
    if (isPriceNegotiable && !deductionReason.trim()) {
      setShopToast({
        kind: "warning",
        title: "Negotiation reason required",
        message:
          "Enter a reason for the negotiated price before placing the order.",
      })
      return
    }
    if (requestedDeduction > total) {
      setShopToast({
        kind: "warning",
        title: "Deduction exceeds the order total",
        message: "Reduce the deduction amount before placing the order.",
      })
      return
    }

    setIsCreatingOrder(true)
    setShopToast(null)
    try {
      const order = await createOrder({
        shopId: selectedShopId,
        isNegotiablePrice: isPriceNegotiable,
        deductedAmount: deduction,
        negotiableReason: isPriceNegotiable
          ? deductionReason.trim() || null
          : null,
      })
      clearCart()
      setSelectedShopId(null)
      setDeductionInput("")
      setDeductionReason("")
      setIsPriceNegotiable(false)

      if (order.smsDelivery.failed > 0) {
        const warnings = []
        if (order.smsDelivery.adminFailed > 0) {
          warnings.push(
            `Notify.lk failed to send ${order.smsDelivery.adminFailed} admin SMS message(s).`
          )
        }
        if (order.smsDelivery.shopFailed) {
          warnings.push("Notify.lk failed to send the shop order confirmation.")
        }
        warnings.push(
          "Contact Notify.lk or upgrade your plan to resolve SMS delivery issues."
        )
        setShopToast({
          kind: "warning",
          title: "Order placed, but SMS delivery failed",
          message: warnings.join(" "),
        })
      } else {
        setShopToast({
          kind: "success",
          title: "Order placed successfully",
          message: `Order ${order.orderId} was placed for ${order.shopName}. Total: ${formatCurrency(order.finalTotal)}. SMS messages were sent.`,
        })
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to place order."
      setShopToast({
        kind: "warning",
        title: "Unable to place order",
        message,
      })
      console.error("Unable to place order:", error)
    } finally {
      setIsCreatingOrder(false)
    }
  }

  return (
    <>
      {shopToast ? (
        <div
          role={shopToast.kind === "warning" ? "alert" : "status"}
          aria-live={shopToast.kind === "warning" ? "assertive" : "polite"}
          className={`fixed right-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-50 flex w-[min(28rem,calc(100vw-2rem))] items-start gap-3 rounded-xl border p-4 shadow-xl xl:bottom-4 ${
            shopToast.kind === "warning"
              ? "border-amber-200 bg-amber-50 text-amber-950"
              : "border-emerald-200 bg-emerald-50 text-emerald-950"
          }`}
        >
          {shopToast.kind === "warning" ? (
            <CircleAlert
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-amber-600"
            />
          ) : (
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-emerald-600"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{shopToast.title}</p>
            <p className="mt-1 text-xs leading-relaxed">{shopToast.message}</p>
          </div>
          <button
            type="button"
            aria-label="Dismiss shop creation message"
            onClick={() => setShopToast(null)}
            className="rounded p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      ) : null}
      <aside className="fixed inset-x-0 bottom-0 z-10 flex max-h-[85svh] flex-col rounded-none border border-red-100 bg-white shadow-[0_-12px_32px_rgba(127,29,29,0.12)] xl:sticky xl:top-4 xl:max-h-[calc(100svh-2rem)] xl:self-start xl:shadow-[0_12px_32px_rgba(127,29,29,0.08)]">
        <div
          className={`grid min-h-0 flex-1 transition-[grid-template-rows,visibility] duration-500 ease-out motion-reduce:transition-none xl:visible xl:grid-rows-[1fr] ${
            isDetailsExpanded
              ? "visible grid-rows-[1fr]"
              : "invisible grid-rows-[0fr]"
          }`}
        >
          <div className="min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain">
            <div className="space-y-5 p-4 sm:p-5 xl:space-y-3 xl:p-3">
              <div className="flex items-center justify-between gap-3 border-b border-red-100 pb-4 xl:pb-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center bg-red-50 text-red-600 xl:size-8">
                    <Building2
                      aria-hidden="true"
                      className="size-5 xl:size-4"
                    />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-900 xl:text-sm">
                      Order summary
                    </h2>
                    <p className="text-xs text-slate-500">
                      {itemCount} {itemCount === 1 ? "item" : "items"}
                    </p>
                  </div>
                </div>

                <label className="flex shrink-0 items-center gap-2 text-right">
                  <span className="text-[11px] leading-tight font-medium text-slate-600">
                    Price
                    <br />
                    negotiable
                  </span>
                  <Switch
                    checked={isPriceNegotiable}
                    onCheckedChange={(checked) => setIsPriceNegotiable(checked)}
                    aria-label="Enable price negotiation"
                  />
                </label>
              </div>

              <div className="space-y-3 xl:space-y-1.5">
                <label
                  htmlFor="cart-shop"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Shop
                </label>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedShopId}
                    onValueChange={(value) => setSelectedShopId(value)}
                  >
                    <SelectTrigger
                      id="cart-shop"
                      className="h-10 min-w-0 flex-1 rounded-none border-red-100 bg-white text-sm focus-visible:border-red-400 focus-visible:ring-red-100 xl:h-9"
                    >
                      <SelectValue>
                        {selectedShop?.full_name ??
                          (availableShops.length > 0
                            ? "Select a shop"
                            : "No shops available")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="border-red-100 bg-white">
                      {availableShops.map((shop) => (
                        <SelectItem
                          key={shop.id}
                          value={shop.id}
                          className="focus:bg-red-50 data-[highlighted]:bg-red-50"
                        >
                          {shop.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <CreateShopSheet
                    onCreate={handleCreateShop}
                    trigger={(openSheet) => (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={openSheet}
                        aria-label="Add a shop"
                        title="Add a shop"
                        className="size-10 shrink-0 rounded-none border-red-200 bg-red-50 p-0 text-red-700 hover:border-red-300 hover:bg-red-100 hover:text-red-800 xl:size-9"
                      >
                        <Plus aria-hidden="true" className="size-4" />
                      </Button>
                    )}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 border-b border-red-100 pb-4 xl:pb-3">
                <span className="flex size-9 shrink-0 items-center justify-center bg-slate-50 text-slate-500 xl:size-8">
                  <UserRound aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-500">
                    Current staff
                  </p>
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {staffName}
                  </p>
                </div>
              </div>

              {isPriceNegotiable ? (
                <div className="space-y-3 border-b border-red-100 pb-4 xl:space-y-2 xl:pb-3">
                  <label
                    htmlFor="price-deduction"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Deduction amount
                  </label>
                  <Input
                    id="price-deduction"
                    type="number"
                    min="0"
                    max={total}
                    step="0.01"
                    inputMode="decimal"
                    value={deductionInput}
                    onChange={(event) => setDeductionInput(event.target.value)}
                    placeholder="Enter amount to deduct"
                    className="h-10 rounded-none border-red-100 focus-visible:border-red-400 focus-visible:ring-red-100 xl:h-9"
                  />
                  {requestedDeduction > total ? (
                    <p className="text-xs text-red-700">
                      Deduction cannot exceed the order total.
                    </p>
                  ) : null}
                  <div className="space-y-1.5 xl:space-y-1">
                    <label
                      htmlFor="deduction-reason"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Reason for deduction{" "}
                      <span className="text-red-600">*</span>
                    </label>
                    <Textarea
                      id="deduction-reason"
                      required
                      aria-required="true"
                      value={deductionReason}
                      onChange={(event) =>
                        setDeductionReason(event.target.value)
                      }
                      placeholder="Add a note about the negotiated price..."
                      className="min-h-20 resize-y rounded-none border-red-100 text-sm focus-visible:border-red-400 focus-visible:ring-red-100 xl:min-h-14 xl:resize-none"
                    />
                  </div>
                </div>
              ) : null}

              <section aria-labelledby="price-details-heading">
                <h3
                  id="price-details-heading"
                  className="text-sm font-bold text-slate-900"
                >
                  Price details
                </h3>
                <dl className="mt-3 space-y-2.5 text-sm xl:mt-2 xl:space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-600">Items subtotal</dt>
                    <dd className="font-medium text-slate-900 tabular-nums">
                      {formatCurrency(subtotal)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-red-100 pt-3 text-red-700 xl:pt-2">
                    <dt>Negotiated deduction</dt>
                    <dd className="font-semibold tabular-nums">
                      −{formatCurrency(deduction)}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>
          </div>
        </div>
        <div className="shrink-0 space-y-3 border-t border-red-100 bg-white px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4 xl:space-y-0 xl:border-t-0 xl:bg-transparent xl:px-3 xl:pt-0 xl:pb-3">
          <div className="flex items-center gap-2 xl:mb-3 xl:items-end xl:justify-between xl:gap-3 xl:border-t-2 xl:border-red-100 xl:pt-3">
            <button
              type="button"
              aria-label={
                isDetailsExpanded
                  ? "Collapse order details"
                  : "Expand order details"
              }
              aria-expanded={isDetailsExpanded}
              onClick={() => setIsDetailsExpanded((expanded) => !expanded)}
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:outline-none xl:hidden"
            >
              {isDetailsExpanded ? (
                <ChevronDown aria-hidden="true" className="size-5" />
              ) : (
                <ChevronUp aria-hidden="true" className="size-5" />
              )}
            </button>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2 xl:items-end">
              <span className="text-md font-bold text-slate-900 xl:text-sm">
                Final total
              </span>
              <span className="text-md truncate font-bold text-red-700 tabular-nums">
                {formatCurrency(finalTotal)}
              </span>
            </div>
          </div>
          <button
            type="button"
            disabled={
              itemCount === 0 ||
              selectedShopId === null ||
              isCreatingOrder ||
              requestedDeduction > total
            }
            onClick={() => void handlePlaceOrder()}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-none bg-red-600 px-3 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm xl:h-10 xl:px-4"
          >
            {isCreatingOrder ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
            ) : (
              <LockKeyhole aria-hidden="true" className="size-4" />
            )}
            {isCreatingOrder ? "Placing order..." : "Place order"}
            {!isCreatingOrder ? (
              <ArrowRight aria-hidden="true" className="size-4" />
            ) : null}
          </button>
        </div>
      </aside>
    </>
  )
}
