"use client"

import { Minus, Package, Plus, X } from "lucide-react"
import { useState } from "react"

import { getColorName } from "@/lib/color-names"

export type CartVariantDisplay = {
  id: string
  models: string[]
  colors: string[]
  quantity: number
  unitPrice: number
  subtotal: number
  onQuantityChange: (quantity: number) => Promise<void>
  onRemove: () => Promise<void>
}

export type CartDisplayItem = {
  productId: string
  name: string
  category: string
  imageUrl?: string
  unitPrice: number
  isBulkPriceApplied: boolean
  variants: CartVariantDisplay[]
}

export function formatCurrency(value: number) {
  return `Rs. ${value.toLocaleString("en-LK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"

export function CartItemsCard({ item }: { item: CartDisplayItem }) {
  const [isBusy, setIsBusy] = useState(false)

  const runAction = async (action: () => Promise<void>) => {
    setIsBusy(true)
    try {
      await action()
    } finally {
      setIsBusy(false)
    }
  }

  const quantity = item.variants.reduce(
    (sum, variant) => sum + variant.quantity,
    0
  )
  const subtotal = item.variants.reduce(
    (sum, variant) => sum + variant.subtotal,
    0
  )

  return (
    <li
      aria-busy={isBusy}
      className={`overflow-hidden rounded-none border border-red-100 bg-white shadow-[0_1px_3px_rgba(127,29,29,0.06)] transition-opacity ${
        isBusy ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-center gap-4 p-4 sm:p-5">
        <div className="flex size-[72px] shrink-0 items-center justify-center overflow-hidden border border-red-100 bg-red-50 text-red-300 sm:size-20">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt={item.name}
              className="size-full object-cover"
            />
          ) : (
            <Package aria-hidden="true" className="size-8 stroke-[1.5]" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 sm:text-base">
            {item.name}
          </h2>
          <p className="mt-1 text-xs text-slate-500">{item.category}</p>
          <p className="mt-1.5 text-xs tabular-nums text-slate-600">
            {formatCurrency(item.unitPrice)}
            <span className="text-slate-400"> per unit</span>
          </p>
          {item.isBulkPriceApplied ? (
            <p className="mt-1 text-[10px] font-medium text-emerald-700">
              Bulk price applied
            </p>
          ) : null}
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xs text-slate-500">{quantity} total</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-red-700">
            {formatCurrency(subtotal)}
          </p>
        </div>
      </div>

      <ul className="divide-y divide-red-50 border-t border-red-100">
        {item.variants.map((variant) => {
          const optionLabel = [
            ...variant.models.map((model) => `Model ${model}`),
            ...variant.colors.map((color) => `Color ${getColorName(color)}`),
          ].join(", ") || "Standard option"

          return (
            <li
              key={variant.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-5"
            >
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                {variant.models.length > 0
                  ? variant.models.map((model) => (
                      <button
                        key={`model-${model}`}
                        type="button"
                        aria-label={`Remove ${optionLabel} from ${item.name}`}
                        title={`Remove ${optionLabel}`}
                        disabled={isBusy}
                        onClick={() => void runAction(variant.onRemove)}
                        className={`inline-flex items-center gap-1.5 border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                      >
                        Model: {model}
                        <X aria-hidden="true" className="size-3.5" />
                      </button>
                    ))
                  : null}
                {variant.colors.length > 0
                  ? variant.colors.map((color) => (
                      <button
                        key={`color-${color}`}
                        type="button"
                        aria-label={`Remove ${optionLabel} from ${item.name}`}
                        title={`Remove ${optionLabel}`}
                        disabled={isBusy}
                        onClick={() => void runAction(variant.onRemove)}
                        className={`inline-flex items-center gap-1.5 border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                      >
                        Color: {getColorName(color)}
                        <X aria-hidden="true" className="size-3.5" />
                      </button>
                    ))
                  : null}
                {variant.models.length === 0 && variant.colors.length === 0 ? (
                  <button
                    type="button"
                    aria-label={`Remove ${item.name} from cart`}
                    disabled={isBusy}
                    onClick={() => void runAction(variant.onRemove)}
                    className={`inline-flex items-center gap-1.5 border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                  >
                    Standard option
                    <X aria-hidden="true" className="size-3.5" />
                  </button>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <div
                  role="group"
                  aria-label={`${item.name}, ${optionLabel} quantity`}
                  className="inline-flex h-9 items-center border border-red-200 bg-white"
                >
                  <button
                    type="button"
                    aria-label={`Decrease ${optionLabel} quantity`}
                    disabled={isBusy || variant.quantity <= 1}
                    onClick={() =>
                      void runAction(() =>
                        variant.onQuantityChange(variant.quantity - 1)
                      )
                    }
                    className={`flex h-full w-8 items-center justify-center text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                  >
                    <Minus aria-hidden="true" className="size-3.5" />
                  </button>
                  <span
                    aria-live="polite"
                    className="min-w-8 border-x border-red-100 px-1 text-center text-xs font-semibold tabular-nums text-slate-900"
                  >
                    {variant.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label={`Increase ${optionLabel} quantity`}
                    disabled={isBusy}
                    onClick={() =>
                      void runAction(() =>
                        variant.onQuantityChange(variant.quantity + 1)
                      )
                    }
                    className={`flex h-full w-8 items-center justify-center text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                  >
                    <Plus aria-hidden="true" className="size-3.5" />
                  </button>
                </div>
                <p className="min-w-24 text-right text-xs font-semibold tabular-nums text-slate-800">
                  {formatCurrency(variant.subtotal)}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </li>
  )
}