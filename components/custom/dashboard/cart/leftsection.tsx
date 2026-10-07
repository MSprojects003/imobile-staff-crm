"use client"

import Link from "next/link"
import {
  AlertCircle,
  ArrowLeft,
  Info,
  Search,
  ShoppingCart,
  X,
} from "lucide-react"

import { hasBulkPriceApplied } from "@/lib/api/cart"
import { useCart } from "@/components/providers/cart-provider"
import * as React from "react"

import { CartItemsCard, type CartDisplayItem } from "./cart-items-card"
import { SummaryCard } from "./summarycard"

type ShopOption = {
  id: string
  full_name: string
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"

function CartSkeleton() {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">Loading your cart…</span>
      {[0, 1, 2].map((key) => (
        <div
          key={key}
          className="grid animate-pulse grid-cols-[72px_minmax(0,1fr)] gap-4 rounded-2xl border border-red-100 bg-white p-4 sm:grid-cols-[96px_minmax(0,1fr)] sm:p-5"
        >
          <div className="size-[72px] rounded-xl bg-red-50 sm:size-24" />
          <div className="space-y-3 py-1">
            <div className="h-4 w-2/3 rounded bg-slate-100" />
            <div className="h-3 w-1/4 rounded bg-red-50" />
            <div className="h-3 w-1/3 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function LeftSection({
  shops,
  staffName,
}: {
  shops: ShopOption[]
  staffName: string
}) {
  const {
    items,
    isLoading,
    error: cartError,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [actionError, setActionError] = React.useState<string | null>(null)
  const runCartAction = React.useCallback(
    async (action: () => Promise<void>) => {
      setActionError(null)
      try {
        await action()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to update your cart."
        setActionError(message)
        console.error("Unable to update cart:", message)
      }
    },
    []
  )
  const quantitiesByProduct = new Map<string, number>()
  for (const item of items) {
    quantitiesByProduct.set(
      item.productId,
      (quantitiesByProduct.get(item.productId) ?? 0) + item.quantity
    )
  }
  const productsById = new Map<string, CartDisplayItem>()
  for (const item of items) {
    const existingProduct = productsById.get(item.productId)
    const variant = {
      id: item.id,
      models: item.models,
      colors: item.colors,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
      onQuantityChange: (quantity: number) =>
        runCartAction(() => updateQuantity(item.id, quantity)),
      onRemove: () => runCartAction(() => removeItem(item.id)),
    }

    if (existingProduct) {
      existingProduct.variants.push(variant)
    } else {
      productsById.set(item.productId, {
        productId: item.productId,
        name: item.productName,
        imageUrl: item.productImage,
        category: item.productCategory,
        unitPrice: item.unitPrice,
        isBulkPriceApplied: hasBulkPriceApplied(
          item.product,
          quantitiesByProduct.get(item.productId) ?? item.quantity,
          item.unitPrice
        ),
        variants: [variant],
      })
    }
  }
  const displayItems = [...productsById.values()]
  const filteredItems = displayItems.filter((item) =>
    item.name
      .toLocaleLowerCase()
      .includes(searchQuery.trim().toLocaleLowerCase())
  )
  const cartItemCount = items.length
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)

  return (
    <div className="grid min-w-0 gap-6 pb-32 xl:h-[calc(100dvh-2rem)] xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)] xl:items-start xl:gap-8 xl:pb-0">
      <section
        aria-labelledby="cart-heading"
        className="min-w-0 xl:flex xl:h-full xl:min-h-0 xl:flex-col"
      >
        <Link
          href="/products"
          className={`inline-flex shrink-0 items-center gap-2 self-start rounded text-sm font-medium text-red-700 transition hover:text-red-900 ${focusRing}`}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Continue shopping
        </Link>

        <div className="mt-4 mb-5 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <h1
            id="cart-heading"
            className="shrink-0 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
          >
            Your cart
          </h1>
          <label className="relative min-w-0 flex-1 sm:mx-auto sm:max-w-md">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              aria-label="Search cart by product name"
              placeholder="Search cart items..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className={`h-10 w-full rounded-full border border-slate-200 bg-white pr-10 pl-11 text-sm text-slate-900 transition outline-none placeholder:text-slate-400 focus:border-red-300 focus:ring-2 focus:ring-red-100 ${focusRing}`}
            />
            {searchQuery ? (
              <button
                type="button"
                aria-label="Clear cart search"
                onClick={() => setSearchQuery("")}
                className="absolute top-1/2 right-3 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            ) : null}
          </label>
          {!isLoading && cartItemCount > 0 ? (
            <span className="shrink-0 self-start rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white sm:self-auto">
              {cartItemCount} {cartItemCount === 1 ? "item" : "items"}
            </span>
          ) : null}
        </div>

        {cartError || actionError ? (
          <div
            role="alert"
            className="mb-4 flex shrink-0 items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800"
          >
            <AlertCircle
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0"
            />
            <p>{actionError ?? cartError}</p>
          </div>
        ) : null}

        {isLoading ? (
          <CartSkeleton />
        ) : cartError ? null : items.length > 0 ? (
          <>
            <div
              dir="rtl"
              className="[scrollbar-width:thin] [scrollbar-color:#fca5a5_#fff1f2] xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pl-2"
            >
              <div dir="ltr">
                <ul className="space-y-3">
                  {filteredItems.map((item) => (
                    <CartItemsCard key={item.productId} item={item} />
                  ))}
                </ul>
                {filteredItems.length === 0 ? (
                  <p className="rounded-none border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                    No cart products match “{searchQuery}”.
                  </p>
                ) : null}
              </div>
            </div>

            <p className="mt-4 flex shrink-0 items-start gap-2 rounded-none bg-red-50 px-4 py-3 text-sm text-red-800">
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              Discount codes and order notes can be added in the next step.
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-red-200 bg-white px-6 py-14 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <ShoppingCart aria-hidden="true" className="size-7" />
            </span>
            <p className="mt-4 text-base font-semibold text-slate-900">
              Your cart is empty
            </p>
            <p className="mt-1 max-w-xs text-sm text-slate-500">
              Products you add will show up here so you can review them before
              checkout.
            </p>
            <Link
              href="/products"
              className={`mt-6 inline-flex h-11 items-center rounded-lg bg-red-600 px-6 text-sm font-semibold text-white transition hover:bg-red-700 active:bg-red-800 ${focusRing}`}
            >
              Browse products
            </Link>
          </div>
        )}
      </section>

      <SummaryCard
        items={displayItems}
        subtotal={subtotal}
        shops={shops}
        staffName={staffName}
        clearCart={clearCart}
      />
    </div>
  )
}