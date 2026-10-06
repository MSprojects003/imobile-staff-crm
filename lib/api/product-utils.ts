import type { SupabaseProduct } from "./products"

type BulkPriceTier = {
  price: number
  startQty?: number
}

function getBulkPriceTiers(product: SupabaseProduct): BulkPriceTier[] {
  if (product.pricing_type !== "bulk" || !Array.isArray(product.price_tiers)) {
    return []
  }

  return product.price_tiers
    .filter(
      (tier): tier is BulkPriceTier =>
        typeof tier === "object" &&
        tier !== null &&
        "price" in tier &&
        typeof tier.price === "number" &&
        Number.isFinite(tier.price)
    )
    .sort(
      (first, second) =>
        (first.startQty ?? 1) - (second.startQty ?? 1)
    )
}

export function getProductBasePrice(product: SupabaseProduct) {
  if (product.fixed_price !== null) return product.fixed_price
  return getBulkPriceTiers(product)[0]?.price ?? null
}

export function getProductPrice(product: SupabaseProduct) {
  const basePrice = getProductBasePrice(product)

  if (basePrice === null) return "Price unavailable"

  return `${product.pricing_type === "bulk" ? "From " : ""}Rs. ${basePrice.toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`
}
