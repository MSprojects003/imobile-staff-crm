"use client"

import * as React from "react"
import Image from "next/image"
import {
  Minus,
  Plus,
  RotateCcw,
  Check,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Zap,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
import { ProductInfoTabs } from "@/components/custom/products/product-info-tabs"
import { useCart } from "@/components/providers/cart-provider"
import {
  getProductBasePrice,
  getProductPrice,
} from "@/lib/api/product-utils"
import { getColorName } from "@/lib/color-names"
import type { SupabaseProduct } from "@/lib/api/products"

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const MIN_QUANTITY = 1
const MAX_QUANTITY = 99
const FALLBACK_IMAGE = "/assets/phones-banner.png"

const TRUST_BADGES: { icon: LucideIcon; title: string; subtitle: string }[] = [
  { icon: Truck, title: "Free Shipping", subtitle: "On all orders" },
  { icon: RotateCcw, title: "30 Days Return", subtitle: "Money back guarantee" },
  { icon: ShieldCheck, title: "Secure Payment", subtitle: "100% secure checkout" },
]

export type AddToCartPayload = {
  models: string[]
  colors: string[]
  quantity: number
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatCurrency(value: number): string {
  return `Rs. ${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

type PriceTier = {
  minQuantity?: number
  maxQuantity?: number
  price: number
}

function isPriceTier(tier: unknown): tier is PriceTier {
  return (
    typeof tier === "object" &&
    tier !== null &&
    "price" in tier &&
    typeof (tier as { price: unknown }).price === "number" &&
    Number.isFinite((tier as { price: number }).price) &&
    (typeof (tier as { min_quantity?: unknown }).min_quantity ===
      "undefined" ||
      typeof (tier as { min_quantity?: unknown }).min_quantity === "number") &&
    (typeof (tier as { max_quantity?: unknown }).max_quantity ===
      "undefined" ||
      typeof (tier as { max_quantity?: unknown }).max_quantity === "number")
  )
}

function getPriceTiers(product: SupabaseProduct): PriceTier[] {
  if (!product.pricing_type || !Array.isArray(product.price_tiers)) return []

  return product.price_tiers
    .filter(isPriceTier)
    .map((tier) => ({
      minQuantity: getTierQuantity(tier, [
        "min_quantity",
        "min",
        "from",
        "startQty",
      ]),
      maxQuantity: getTierQuantity(tier, [
        "max_quantity",
        "max",
        "to",
        "endQty",
      ]),
      price: tier.price,
    }))
}

function getTierQuantity(
  tier: PriceTier,
  keys: Array<
    | "min_quantity"
    | "max_quantity"
    | "min"
    | "max"
    | "from"
    | "to"
    | "startQty"
    | "endQty"
  >
) {
  const record = tier as PriceTier & Record<string, unknown>
  const value = keys
    .map((key) => record[key])
    .find((candidate) => typeof candidate === "number")

  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function getUniqueModels(product: SupabaseProduct): string[] {
  return [
    ...new Set(
      [product.model, product.model_number].filter((m): m is string =>
        Boolean(m)
      )
    ),
  ]
}

/* -------------------------------------------------------------------------- */
/* Sub-components                                                             */
/* -------------------------------------------------------------------------- */

function ImageGallery({
  images,
  alt,
  discountPercent,
}: {
  images: string[]
  alt: string
  discountPercent: number
}) {
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)
  const [desktopImageVisible, setDesktopImageVisible] = React.useState(true)
  const hasMultiple = images.length > 1

  React.useEffect(() => {
    if (!api) return

    const sync = () => setCurrent(api.selectedScrollSnap())
    sync()
    api.on("select", sync)
    api.on("reInit", sync)

    return () => {
      api.off("select", sync)
      api.off("reInit", sync)
    }
  }, [api])

  const selectDesktopImage = (index: number) => {
    if (index === current) return

    setDesktopImageVisible(false)
    setCurrent(index)
    window.requestAnimationFrame(() => setDesktopImageVisible(true))
  }

  return (
    <div className="flex min-w-0 gap-4">
      {/* Desktop thumbnails (vertical) */}
      {hasMultiple && (
        <div className="hidden w-16 shrink-0 flex-col gap-2 md:flex">
          {images.map((image, index) => {
            const isSelected = current === index
            return (
              <button
                key={`${image}-${index}`}
                type="button"
                aria-label={`View product image ${index + 1}`}
                aria-pressed={isSelected}
                onClick={() => selectDesktopImage(index)}
                className={`relative aspect-square w-full rounded-none border bg-[#f6f7f9] ${
                  isSelected
                    ? "border-[#e7242b] ring-1 ring-[#e7242b]"
                    : "border-[#e5e8ec] hover:border-[#c5ccd4]"
                }`}
              >
                <Image
                  src={image}
                  alt=""
                  fill
                  unoptimized
                  sizes="64px"
                  className="object-contain p-1"
                />
              </button>
            )
          })}
        </div>
      )}

      {/* Mobile carousel with thumbnails below the main image */}
      <div className="flex min-w-0 flex-1 flex-col gap-3 md:hidden">
        <div className="relative min-w-0 overflow-hidden rounded-none border border-[#edf0f2] bg-[#f6f7f9]">
          <Carousel
            setApi={setApi}
            opts={{ loop: hasMultiple }}
            className="w-full"
          >
            <CarouselContent className="ml-0">
              {images.map((image, index) => (
                <CarouselItem key={`${image}-${index}`} className="pl-0">
                  <div className="relative aspect-square">
                    <Image
                      src={image}
                      alt={`${alt} - image ${index + 1}`}
                      fill
                      priority={index === 0}
                      unoptimized
                      sizes="100vw"
                      className="object-contain p-4"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          {discountPercent > 0 ? (
            <span className="absolute top-0 left-0 z-10 bg-[#e7242b] px-3 py-1.5 text-xs font-bold text-white">
              -{discountPercent}%
            </span>
          ) : null}
        </div>

        {hasMultiple ? (
          <div
            aria-label="Product image thumbnails"
            className="flex w-full gap-2 overflow-x-auto pb-1"
          >
            {images.map((image, index) => (
              <button
                key={`${image}-thumbnail-${index}`}
                type="button"
                aria-label={`View product image ${index + 1}`}
                aria-pressed={current === index}
                onClick={() => api?.scrollTo(index)}
                className={`relative size-16 shrink-0 overflow-hidden border bg-[#f6f7f9] ${
                  current === index
                    ? "border-[#e7242b] ring-1 ring-[#e7242b]"
                    : "border-[#e5e8ec]"
                }`}
              >
                <Image
                  src={image}
                  alt=""
                  fill
                  unoptimized
                  sizes="64px"
                  className="object-contain p-1"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Desktop image: thumbnail selection with a soft opacity transition */}
      <div className="relative hidden min-w-0 flex-1 overflow-hidden rounded-none border border-[#edf0f2] bg-[#f6f7f9] md:block">
        <div className="relative flex aspect-square w-full items-start justify-center lg:min-h-[520px]">
          <Image
            key={images[current]}
            src={images[current]}
            alt={`${alt} - image ${current + 1}`}
            fill
            priority={current === 0}
            unoptimized
            sizes="(min-width: 1024px) 50vw, 100vw"
            className={`object-contain object-center p-4 transition-opacity duration-300 ease-out ${
              desktopImageVisible ? "opacity-100" : "opacity-0"
            }`}
          />
        </div>
        {discountPercent > 0 ? (
          <span className="absolute top-0 left-0 z-10 bg-[#e7242b] px-3 py-1.5 text-xs font-bold text-white">
            -{discountPercent}%
          </span>
        ) : null}
      </div>
    </div>
  )
}

function MetaItem({
  label,
  value,
  truncate = false,
}: {
  label: string
  value: React.ReactNode
  truncate?: boolean
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold text-[#8795a3]">{label}</p>
      <p
        className={`mt-1 text-sm font-medium text-[#192d4a] ${
          truncate ? "truncate" : ""
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function PriceBlock({
  currentPrice,
  originalPrice,
  fallback,
  pricingType,
  discountPercent,
}: {
  currentPrice: number | null
  originalPrice: number | null
  fallback: string
  pricingType: SupabaseProduct["pricing_type"]
  discountPercent: number
}) {
  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-3xl font-bold text-[#e7242b]">
          {currentPrice === null ? fallback : formatCurrency(currentPrice)}
        </span>
        {originalPrice !== null && (
          <>
            <span className="text-base text-[#9aa5af] line-through">
              {formatCurrency(originalPrice)}
            </span>
            <span className="bg-[#fce8e9] px-2 py-1 text-xs font-bold text-[#e7242b]">
              {discountPercent}% OFF
            </span>
          </>
        )}
      </div>
      <span className="mt-2 inline-flex border border-[#d8e0e8] px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-[#657487]">
        {pricingType === "bulk" ? "Bulk pricing" : "Fixed price"}
      </span>
    </div>
  )
}

function BulkPriceTable({ tiers }: { tiers: PriceTier[] }) {
  if (tiers.length === 0) return null

  return (
    <section className="mt-6" aria-labelledby="bulk-pricing-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="bulk-pricing-title"
          className="text-sm font-semibold text-[#192d4a]"
        >
          Bulk pricing
        </h2>
        <span className="text-xs text-[#8795a3]">Price per unit</span>
      </div>
      <div className="mt-3 overflow-hidden border border-[#d8e0e8] bg-white/60">
        <div className="grid grid-cols-[1fr_auto] border-b border-[#edf0f2] bg-[#f8fafb] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#8795a3]">
          <span>Quantity</span>
          <span>Unit price</span>
        </div>
        {tiers.map((tier, index) => (
          <div
            key={`${tier.minQuantity ?? "min"}-${tier.maxQuantity ?? "max"}-${tier.price}-${index}`}
            className="grid grid-cols-[1fr_auto] items-center border-b border-[#edf0f2] px-4 py-3 text-sm last:border-b-0"
          >
            <span className="font-medium text-[#526274]">
              {formatQuantityRange(tier)}
            </span>
            <span className="font-semibold text-[#e7242b]">
              {formatCurrency(tier.price)}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

function formatQuantityRange(tier: PriceTier) {
  if (tier.minQuantity !== undefined && tier.maxQuantity !== undefined) {
    return `${tier.minQuantity} - ${tier.maxQuantity} units`
  }
  if (tier.minQuantity !== undefined) return `${tier.minQuantity}+ units`
  if (tier.maxQuantity !== undefined) return `Up to ${tier.maxQuantity} units`
  return "All quantities"
}

function getUnitPriceForQuantity(
  product: SupabaseProduct,
  quantity: number,
  tiers: PriceTier[],
  fallback: number | null
) {
  if (product.pricing_type === "bulk" && tiers.length > 0) {
    const activeTier =
      tiers.find(
        (tier) =>
          (tier.minQuantity === undefined || quantity >= tier.minQuantity) &&
          (tier.maxQuantity === undefined || quantity <= tier.maxQuantity)
      ) ??
      [...tiers]
        .reverse()
        .find(
          (tier) =>
            tier.minQuantity === undefined || quantity >= tier.minQuantity
        ) ??
      tiers[0]

    return activeTier.price
  }

  return fallback
}

function ModelSelector({
  models,
  selected,
  onToggle,
}: {
  models: string[]
  selected: string[]
  onToggle: (model: string) => void
}) {
  return (
    <div className="mt-6" role="group" aria-labelledby="model-label">
      <p id="model-label" className="text-sm font-semibold text-[#192d4a]">
        Model:{" "}
        <span className="font-normal text-[#e7242b]">
          {selected.join(", ")}
        </span>
      </p>
      <p className="mt-1 text-xs text-[#8795a3]">Select one or more models.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {models.map((model) => {
          const isSelected = selected.includes(model)
          return (
            <button
              key={model}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(model)}
              className={`min-w-20 rounded-none border px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e7242b] ${
                isSelected
                  ? "border-[#e7242b] bg-[#fff1f1] text-[#e7242b]"
                  : "border-[#d8e0e8] text-[#526274] hover:border-[#e7242b] hover:text-[#e7242b]"
              }`}
            >
              {model}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ColorSelector({
  colors,
  selected,
  singleOnly,
  onToggle,
}: {
  colors: string[]
  selected: string[]
  singleOnly: boolean
  onToggle: (color: string) => void
}) {
  return (
    <div className="mt-6" role="group" aria-labelledby="color-label">
      <p id="color-label" className="text-sm font-semibold text-[#192d4a]">
        Color:{" "}
        <span className="font-normal text-[#e7242b]">
          {selected.map(getColorName).join(", ")}
        </span>
      </p>
      <p className="mt-1 text-xs text-[#8795a3]">
        {singleOnly
          ? "Multiple models selected: choose 1 color."
          : "Single model selected: choose one or more colors."}
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        {colors.map((color) => {
          const isSelected = selected.includes(color)
          return (
            <button
              key={color}
              type="button"
              aria-label={`Select ${getColorName(color)} color`}
              aria-pressed={isSelected}
              title={getColorName(color)}
              onClick={() => onToggle(color)}
              style={{ backgroundColor: color }}
              className={`size-9 rounded-none border transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e7242b] ${
                isSelected
                  ? "border-white ring-2 ring-[#e7242b] ring-offset-0"
                  : "border-[#d8e0e8] hover:border-[#9aa5af]"
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}

function QuantitySelector({
  value,
  onChange,
  estimatedAmount,
  unitPrice,
}: {
  value: number
  onChange: (value: number) => void
  estimatedAmount: number | null
  unitPrice: number | null
}) {
  const buttonClass =
    "flex size-10 items-center justify-center rounded-none text-[#526274] hover:bg-[#f5f8fb] disabled:opacity-40 disabled:hover:bg-transparent"

  return (
    <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-[#192d4a]">Quantity</p>
        <div className="mt-3 inline-flex h-10 items-center rounded-none border border-[#d8e0e8]">
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={value <= MIN_QUANTITY}
            onClick={() => onChange(Math.max(MIN_QUANTITY, value - 1))}
            className={buttonClass}
          >
            <Minus className="size-4" />
          </button>
          <span
            aria-live="polite"
            className="w-12 border-x border-[#d8e0e8] text-center text-sm font-semibold leading-10 text-[#192d4a]"
          >
            {value}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            disabled={value >= MAX_QUANTITY}
            onClick={() => onChange(Math.min(MAX_QUANTITY, value + 1))}
            className={buttonClass}
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs font-medium text-[#8795a3]">Estimated amount</p>
        <p className="mt-1 text-base font-semibold text-[#e7242b]">
          {estimatedAmount === null
            ? "Price unavailable"
            : formatCurrency(estimatedAmount)}
        </p>
        {unitPrice !== null ? (
          <p className="text-[11px] text-[#8795a3]">
            {formatCurrency(unitPrice)} per unit
          </p>
        ) : null}
      </div>
    </div>
  )
}

function TrustBadges() {
  return (
    <ul className="mt-7 grid grid-cols-1 gap-3 border-t border-[#edf0f2] pt-5 sm:grid-cols-3">
      {TRUST_BADGES.map(({ icon: Icon, title, subtitle }) => (
        <li key={title} className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center border border-[#edf0f2] bg-[#fafbfc]">
            <Icon aria-hidden="true" className="size-5 text-[#e7242b]" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-[#192d4a]">
              {title}
            </span>
            <span className="block text-[11px] text-[#8795a3]">{subtitle}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

/* -------------------------------------------------------------------------- */
/* Main component                                                             */
/* -------------------------------------------------------------------------- */

export function ProductDetails({
  product,
  onAddToCart,
}: {
  product: SupabaseProduct
  onAddToCart?: (payload: AddToCartPayload) => void
}) {
  const images = product.images.length ? product.images : [FALLBACK_IMAGE]
  const modelOptions = React.useMemo(() => getUniqueModels(product), [product])
  const priceTiers = React.useMemo(() => getPriceTiers(product), [product])
  const { addItem } = useCart()
  const productDiscountPercent =
    typeof product.discount_percentage === "number" &&
    product.discount_percentage > 0
      ? product.discount_percentage
      : 0

  const [selectedModels, setSelectedModels] = React.useState<string[]>(
    modelOptions[0] ? [modelOptions[0]] : []
  )
  const [selectedColors, setSelectedColors] = React.useState<string[]>(
    product.colors[0] ? [product.colors[0]] : []
  )
  const [quantity, setQuantity] = React.useState(MIN_QUANTITY)
  const [isAddingToCart, setIsAddingToCart] = React.useState(false)
  const [cartError, setCartError] = React.useState<string | null>(null)
  const [showCartSuccess, setShowCartSuccess] = React.useState(false)
  const cartToastTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(
    () => () => {
      if (cartToastTimeout.current) clearTimeout(cartToastTimeout.current)
    },
    []
  )

  // Rule: multiple models -> only 1 color. Single model -> multiple colors.
  const isMultiModel = selectedModels.length > 1

  const handleToggleModel = (model: string) => {
    const exists = selectedModels.includes(model)

    // Always keep at least one model selected.
    if (exists && selectedModels.length === 1) return

    const nextModels = exists
      ? selectedModels.filter((m) => m !== model)
      : [...selectedModels, model]

    setSelectedModels(nextModels)

    // Entering multi-model mode: trim colors down to a single one.
    if (nextModels.length > 1 && selectedColors.length > 1) {
      setSelectedColors(selectedColors.slice(0, 1))
    }
  }

  const handleToggleColor = (color: string) => {
    if (isMultiModel) {
      setSelectedColors([color])
      return
    }

    const exists = selectedColors.includes(color)
    // Always keep at least one color selected.
    if (exists && selectedColors.length === 1) return

    setSelectedColors(
      exists
        ? selectedColors.filter((c) => c !== color)
        : [...selectedColors, color]
    )
  }

  const handleAddToCart = async () => {
    if (estimatedAmount === null) return

    setIsAddingToCart(true)
    setCartError(null)

    try {
      await addItem({
        productId: product.id,
        models: selectedModels,
        colors: selectedColors,
        quantity,
        subtotal: estimatedAmount,
      })
      onAddToCart?.({
        models: selectedModels,
        colors: selectedColors,
        quantity,
      })
      setShowCartSuccess(true)
      if (cartToastTimeout.current) clearTimeout(cartToastTimeout.current)
      cartToastTimeout.current = setTimeout(() => setShowCartSuccess(false), 3000)
    } catch (error) {
      setCartError(
        error instanceof Error
          ? error.message
          : "Unable to add this product to your cart."
      )
    } finally {
      setIsAddingToCart(false)
    }
  }

  const currentPrice = getProductBasePrice(product)
  const originalPrice =
    productDiscountPercent > 0 && product.old_price !== null
      ? product.old_price
      : null
  const unitPrice = getUnitPriceForQuantity(
    product,
    quantity,
    priceTiers,
    currentPrice
  )
  const estimatedAmount = unitPrice === null ? null : unitPrice * quantity
  const priceLabel =
    currentPrice === null
      ? getProductPrice(product)
      : formatCurrency(currentPrice)

  return (
    <>
      <main className="min-h-[calc(100vh-68px)] bg-transparent">
        <div className="mx-auto w-full max-w-[1500px] px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:py-10 lg:pb-10">
        {/* Desktop grid: left | vertical divider | right */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_1px_minmax(360px,0.95fr)] lg:gap-10">
          {/* Left column */}
          <section className="flex min-w-0 flex-col gap-6">
            <ImageGallery
              images={images}
              alt={product.name}
              discountPercent={productDiscountPercent}
            />
            {/* Desktop only here; mobile version renders below the purchase panel */}
            <div className="hidden lg:block">
              <ProductInfoTabs
                description={product.description}
                specifications={product.specifications}
              />
            </div>
          </section>

          {/* Vertical divider (desktop only) */}
          <div aria-hidden="true" className="hidden bg-[#e5e8ec] lg:block" />

          {/* Right column */}
          <section className="flex min-w-0 flex-col">
            <p className="text-sm font-semibold tracking-wide text-[#e7242b]">
              {product.brand}
            </p>
            <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-[#192d4a] sm:text-3xl lg:text-4xl">
              {product.name}
            </h1>

            <div className="mt-4 grid grid-cols-2 gap-3 border-y border-[#edf0f2] py-4 sm:grid-cols-3">
              <MetaItem
                label="Model"
                value={selectedModels.join(", ") || "Not specified"}
              />
              <MetaItem
                label="Year"
                value={product.manufactured_year ?? "Not specified"}
              />
              <MetaItem label="SKU" value={product.sku} truncate />
            </div>

            <PriceBlock
              currentPrice={currentPrice}
              originalPrice={originalPrice}
              fallback={getProductPrice(product)}
              pricingType={product.pricing_type}
              discountPercent={productDiscountPercent}
            />

            <p className="mt-5 text-base leading-7 text-[#657487]">
              {product.description}
            </p>

            {modelOptions.length > 0 && (
              <ModelSelector
                models={modelOptions}
                selected={selectedModels}
                onToggle={handleToggleModel}
              />
            )}

            {product.colors.length > 0 && (
              <ColorSelector
                colors={product.colors}
                selected={selectedColors}
                singleOnly={isMultiModel}
                onToggle={handleToggleColor}
              />
            )}

            {product.pricing_type === "bulk" && (
              <BulkPriceTable tiers={priceTiers} />
            )}

            <QuantitySelector
              value={quantity}
              onChange={setQuantity}
              estimatedAmount={estimatedAmount}
              unitPrice={unitPrice}
            />

            <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                type="button"
                onClick={handleAddToCart}
                className="h-12 rounded-none bg-[#e7242b] text-base font-semibold text-white hover:bg-[#c91d24]"
                disabled={isAddingToCart}
              >
                <ShoppingCart className="size-5" />
                Add to Cart
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-none border-[#e7242b] bg-white text-base font-semibold text-[#e7242b] hover:bg-[#fff1f1] hover:text-[#c91d24]"
              >
                <Zap className="size-5" />
                Buy Now
              </Button>
            </div>
            {cartError ? (
              <p role="alert" className="mt-3 text-sm text-[#c91d24]">
                {cartError}
              </p>
            ) : null}

            <TrustBadges />
          </section>
        </div>

        {/* Mobile / tablet: info sections (accordion) below the purchase panel */}
        <div className="mt-8 lg:hidden">
          <ProductInfoTabs
            description={product.description}
            specifications={product.specifications}
          />
        </div>
        </div>
      </main>

      {showCartSuccess ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 right-4 z-50 flex items-center gap-2 border border-[#b7e4c7] bg-white px-4 py-3 text-sm font-medium text-[#216e39] shadow-lg"
        >
          <Check className="size-4 shrink-0" />
          {product.name} added to cart
        </div>
      ) : null}

      {/* Mobile sticky purchase bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-[#edf0f2] bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(25,45,74,0.06)] lg:hidden">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-[#e7242b]">
            {priceLabel}
          </p>
          {originalPrice !== null && (
            <p className="text-xs text-[#9aa5af] line-through">
              {formatCurrency(originalPrice)}
            </p>
          )}
        </div>
        <Button
          type="button"
          onClick={handleAddToCart}
          disabled={isAddingToCart}
          className="h-11 shrink-0 rounded-none bg-[#e7242b] px-6 font-semibold text-white hover:bg-[#c91d24]"
        >
          <ShoppingCart className="size-5" />
          Add to Cart
        </Button>
      </div>
    </>
  )
} 