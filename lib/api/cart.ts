import type { SupabaseClient } from "@supabase/supabase-js"

export type CartProduct = {
  id: string
  name?: string
  images?: string[]
  category?: string
  pricing_type: "fixed" | "bulk"
  fixed_price: number | null
  price_tiers: unknown
}

export type CartItem = {
  id: string
  productId: string
  productName: string
  productImage?: string
  productCategory: string
  models: string[]
  colors: string[]
  quantity: number
  unitPrice: number
  subtotal: number
  product: CartProduct
}

type CartRow = {
  id: string
  product_id: string
  models: string[]
  colors: string[]
  quantity: number
  subtotal: number
  product: CartProduct
}

type PriceTier = {
  minQuantity?: number
  maxQuantity?: number
  price: number
}

type ErrorField = "message" | "code" | "details" | "hint"

function getErrorField(error: unknown, field: ErrorField) {
  if (typeof error !== "object" || error === null) return undefined

  try {
    const value = Reflect.get(error, field)
    return typeof value === "string" && value.length > 0 ? value : undefined
  } catch {
    return undefined
  }
}

function getCartErrorMessage(error: unknown, operation: string) {
  const code = getErrorField(error, "code")
  const message =
    getErrorField(error, "message") ??
    (error instanceof Error ? error.message : undefined) ??
    (typeof error === "string" ? error : undefined) ??
    String(error ?? "Unknown error")

  if (
    code === "PGRST202" ||
    /could not find the function|function .* does not exist/i.test(message)
  ) {
    return `Cart database setup is incomplete (${operation}). Run the latest supabase/cart.sql in the Supabase SQL Editor.`
  }

  if (
    code === "42703" &&
    /column ["']?is_active["']? does not exist/i.test(message)
  ) {
    return `The deployed cart database function still uses the old is_active column (${operation}). Run supabase/cart-cleared-column-fix.sql in the Supabase SQL Editor, then run the latest supabase/cart.sql to update the remaining cart functions.`
  }

  const metadata = (["code", "details", "hint"] as const)
    .map((field) => {
      const value = getErrorField(error, field)
      return value ? `${field}: ${value}` : undefined
    })
    .filter((value): value is string => Boolean(value))
    .join("; ")

  return `${operation}: ${message}${metadata ? ` (${metadata})` : ""}`
}

function isExpiredJwtError(error: unknown) {
  return (
    getErrorField(error, "code") === "PGRST303" ||
    /jwt expired/i.test(getErrorField(error, "message") ?? "")
  )
}

async function runWithSessionRefresh<T extends { error: unknown }>(
  supabase: SupabaseClient,
  operation: () => Promise<T>
): Promise<T> {
  const result = await operation()
  if (!result.error || !isExpiredJwtError(result.error)) return result

  const { data, error } = await supabase.auth.refreshSession()
  if (error) {
    throw new Error(
      getCartErrorMessage(error, "Refreshing the Supabase session failed")
    )
  }
  if (!data.session) {
    throw new Error("Your session has expired. Please sign in again.")
  }

  return operation()
}

function getTierQuantity(
  tier: Record<string, unknown>,
  keys: string[]
): number | undefined {
  const value = keys
    .map((key) => tier[key])
    .find(
      (candidate) =>
        typeof candidate === "number" ||
        (typeof candidate === "string" && candidate.trim() !== "")
    )

  const quantity = Number(value)
  return Number.isFinite(quantity) ? quantity : undefined
}

function getPriceTiers(product: CartProduct): PriceTier[] {
  if (product.pricing_type !== "bulk" || !Array.isArray(product.price_tiers)) {
    return []
  }

  return product.price_tiers.flatMap((value) => {
    if (
      typeof value !== "object" ||
      value === null ||
      !("price" in value) ||
      (typeof value.price !== "number" &&
        (typeof value.price !== "string" || value.price.trim() === "")) ||
      !Number.isFinite(Number(value.price))
    ) {
      return []
    }

    const tier = value as Record<string, unknown>
    return [{
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
      price: Number(value.price),
    }]
  })
}

export function getCartUnitPrice(product: CartProduct, totalQuantity: number) {
  if (product.pricing_type !== "bulk") {
    if (product.fixed_price === null) {
      throw new Error(`Fixed price is missing for product ${product.id}.`)
    }
    return product.fixed_price
  }

  const tiers = getPriceTiers(product)
  const matchingTier = tiers.find(
    (tier) =>
      (tier.minQuantity === undefined ||
        totalQuantity >= tier.minQuantity) &&
      (tier.maxQuantity === undefined ||
        totalQuantity <= tier.maxQuantity)
  )

  if (matchingTier) return matchingTier.price

  const fallbackTier = [...tiers]
    .reverse()
    .find(
      (tier) =>
        tier.minQuantity === undefined || totalQuantity >= tier.minQuantity
    )

  const unitPrice = fallbackTier?.price ?? tiers[0]?.price
  if (unitPrice === undefined) {
    throw new Error(`Bulk price tiers are missing for product ${product.id}.`)
  }
  return unitPrice
}

export function hasBulkPriceApplied(
  product: CartProduct,
  totalQuantity: number,
  unitPrice: number
) {
  return (
    product.pricing_type === "bulk" &&
    unitPrice !== getCartUnitPrice(product, 1) &&
    unitPrice === getCartUnitPrice(product, totalQuantity)
  )
}

export async function getCartUserId(supabase: SupabaseClient) {
  const { data, error } = await runWithSessionRefresh(supabase, async () =>
    await supabase.rpc("current_public_user_id")
  )

  if (error) {
    throw new Error(
      getCartErrorMessage(error, "Resolving the public user ID failed")
    )
  }
  return data
}

export async function fetchCartItems(
  supabase: SupabaseClient,
  publicUserId?: string
): Promise<{ publicUserId: string | null; items: CartItem[] }> {
  const resolvedUserId = publicUserId ?? (await getCartUserId(supabase))
  if (!resolvedUserId) return { publicUserId: null, items: [] }

  const { error: pricingError } = await runWithSessionRefresh(
    supabase,
    async () => await supabase.rpc("refresh_cart_prices")
  )
  if (pricingError) {
    throw new Error(
      getCartErrorMessage(pricingError, "Refreshing cart prices failed")
    )
  }

  const { data, error } = await runWithSessionRefresh(supabase, async () =>
    await supabase
      .from("cart_items")
      .select(
        "id, product_id, models, colors, quantity, subtotal, product:products!inner(id, name, images, category, pricing_type, fixed_price, price_tiers)"
      )
      .eq("user_id", resolvedUserId)
      .eq("isCleared", false)
      .order("created_at", { ascending: true })
  )
  if (error) {
    throw new Error(getCartErrorMessage(error, "Loading cart_items failed"))
  }

  const rows = (data ?? []) as unknown as CartRow[]
  const totalsByProduct = new Map<string, number>()
  for (const row of rows) {
    totalsByProduct.set(
      row.product_id,
      (totalsByProduct.get(row.product_id) ?? 0) + row.quantity
    )
  }

  const items = rows.map((row) => ({
    id: row.id,
    productId: row.product_id,
    productName: row.product.name ?? "Product",
    productImage: row.product.images?.[0],
    productCategory: row.product.category ?? "Uncategorized",
    models: row.models,
    colors: row.colors,
    quantity: row.quantity,
    unitPrice: getCartUnitPrice(
      row.product,
      totalsByProduct.get(row.product_id) ?? row.quantity
    ),
    subtotal: row.subtotal,
    product: row.product,
  }))

  return { publicUserId: resolvedUserId, items }
}

export async function addCartItem(
  supabase: SupabaseClient,
  item: {
    productId: string
    models: string[]
    colors: string[]
    quantity: number
    subtotal: number
  }
) {
  const { error } = await runWithSessionRefresh(supabase, async () =>
    await supabase.rpc("add_cart_item", {
      p_product_id: item.productId,
      p_models: item.models,
      p_colors: item.colors,
      p_quantity: item.quantity,
      p_subtotal: item.subtotal,
    })
  )
  if (error) throw new Error(getCartErrorMessage(error, "Adding cart item failed"))
}

export async function updateCartItemQuantity(
  supabase: SupabaseClient,
  id: string,
  quantity: number
) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Cart quantity must be a positive whole number.")
  }

  const { error } = await runWithSessionRefresh(supabase, async () =>
    await supabase.rpc("update_cart_item_quantity", {
      p_cart_item_id: id,
      p_quantity: quantity,
    })
  )
  if (error) {
    throw new Error(getCartErrorMessage(error, "Updating cart quantity failed"))
  }
}

export function repriceCartItems(items: CartItem[]) {
  const totalsByProduct = new Map<string, number>()
  for (const item of items) {
    totalsByProduct.set(
      item.productId,
      (totalsByProduct.get(item.productId) ?? 0) + item.quantity
    )
  }

  return items.map((item) => {
    const unitPrice = getCartUnitPrice(
      item.product,
      totalsByProduct.get(item.productId) ?? item.quantity
    )
    return {
      ...item,
      unitPrice,
      subtotal: unitPrice * item.quantity,
    }
  })
}

export async function removeCartItem(supabase: SupabaseClient, id: string) {
  const { error } = await runWithSessionRefresh(supabase, async () =>
    await supabase.rpc("remove_cart_item", { p_cart_item_id: id })
  )
  if (error) {
    throw new Error(getCartErrorMessage(error, "Removing cart item failed"))
  }
}
