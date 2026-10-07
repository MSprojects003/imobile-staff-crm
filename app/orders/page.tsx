import { redirect } from "next/navigation"

import { AppSidebar } from "@/components/custom/dashboard/app-sidebar"
import {
  OrdersTable,
  type OrderListItem,
  type OrderProduct,
  type OrderVariant,
} from "@/components/custom/orders/table"
import { getCurrentUser } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

type OrderRow = {
  id: string
  order_id: string
  user_id: string
  shop_id: string
  estimated_total: number | string
  products_count: number | string
  deducted_amount: number | string | null
  refund_amount: number | string | null
  status: string | null
  created_at: string
  parcels_delivered: number | string | null
}

type ShopRow = {
  id: string
  name: string
}

type OrderItemRow = {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  product_image: string | null
  quantity: number | string
  subtotal: number | string
}

type ProductImageRow = {
  id: string
  images: string[] | null
}

type SubOrderItemRow = {
  order_item_id: string
  models: string[] | null
  colors: string[] | null
  quantity: number | string
  unit_price: number | string
  subtotal: number | string
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export default async function OrdersPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const adminClient = createSupabaseAdminClient()
  const { data: staffData, error: staffError } = await adminClient
    .from("staff")
    .select("id, user_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .eq("is_deleted", false)

  if (staffError) {
    throw new Error(`Unable to resolve the current staff record: ${staffError.message}`)
  }

  const staffRows = (staffData ?? []) as { id: string; user_id: string }[]
  const staffIds = staffRows.map((staff) => staff.id)
  let orderRows: OrderRow[] = []

  if (staffIds.length > 0) {
    const { data: orderData, error: ordersError } = await adminClient
      .from("orders")
      .select(
        "id, order_id, user_id, shop_id, estimated_total, products_count, deducted_amount, refund_amount, status, created_at, parcels_delivered"
      )
      .in("user_id", staffIds)
      .order("created_at", { ascending: false })

    if (ordersError) {
      throw new Error(`Unable to load orders: ${ordersError.message}`)
    }

    orderRows = (orderData ?? []) as OrderRow[]
  }

  const shopIds = [...new Set(orderRows.map((order) => order.shop_id))]
  let shops: { id: string; name: string }[] = []

  if (shopIds.length > 0) {
    const { data: shopData, error: shopsError } = await adminClient
      .from("shops")
      .select("id, name")
      .in("id", shopIds)
      .order("name")

    if (shopsError) {
      throw new Error(
        `Unable to load shops for order filters: ${shopsError.message}`
      )
    }

    shops = ((shopData ?? []) as ShopRow[]).map((shop) => ({
      id: shop.id,
      name: shop.name,
    }))
  }

  let orderItemRows: OrderItemRow[] = []
  let subOrderItemRows: SubOrderItemRow[] = []
  let productImagesById = new Map<string, string | null>()

  if (orderRows.length > 0) {
    const orderIds = orderRows.map((order) => order.id)
    const { data: orderItemsData, error: orderItemsError } = await adminClient
      .from("order_items")
      .select(
        "id, order_id, product_id, product_name, product_image, quantity, subtotal"
      )
      .in("order_id", orderIds)

    if (orderItemsError) {
      throw new Error(
        `Unable to load order products: ${orderItemsError.message}`
      )
    }

    orderItemRows = (orderItemsData ?? []) as OrderItemRow[]

    const orderItemIds = orderItemRows.map((item) => item.id)
    const productIdsMissingImages = [
      ...new Set(
        orderItemRows.flatMap((item) =>
          !item.product_image?.trim() && item.product_id
            ? [item.product_id]
            : []
        )
      ),
    ]
    const [variantResult, productImagesResult] = await Promise.all([
      orderItemIds.length > 0
        ? adminClient
            .from("sub_order_items")
            .select(
              "order_item_id, models, colors, quantity, unit_price, subtotal"
            )
            .in("order_item_id", orderItemIds)
        : Promise.resolve({ data: [], error: null }),
      productIdsMissingImages.length > 0
        ? adminClient
            .from("products")
            .select("id, images")
            .in("id", productIdsMissingImages)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (variantResult.error) {
      throw new Error(
        `Unable to load order variant details: ${variantResult.error.message}`
      )
    }
    if (productImagesResult.error) {
      throw new Error(
        `Unable to load product images for orders: ${productImagesResult.error.message}`
      )
    }

    subOrderItemRows = (variantResult.data ?? []) as SubOrderItemRow[]
    productImagesById = new Map(
      ((productImagesResult.data ?? []) as ProductImageRow[]).map(
        (product) => [
          product.id,
          product.images?.find((image) => image.trim())?.trim() ?? null,
        ]
      )
    )
  }

  const shopNameById = new Map(shops.map((shop) => [shop.id, shop.name]))
  const variantsByOrderItem = new Map<string, OrderVariant[]>()
  for (const item of subOrderItemRows) {
    const variants = variantsByOrderItem.get(item.order_item_id) ?? []
    variants.push({
      models: item.models ?? [],
      colors: item.colors ?? [],
      quantity: toNumber(item.quantity),
      unitPrice: toNumber(item.unit_price),
      subtotal: toNumber(item.subtotal),
    })
    variantsByOrderItem.set(item.order_item_id, variants)
  }

  const productsByOrderId = new Map<string, OrderProduct[]>()
  for (const item of orderItemRows) {
    const products = productsByOrderId.get(item.order_id) ?? []
    products.push({
      id: item.id,
      productId: item.product_id,
      name: item.product_name,
      image:
        item.product_image?.trim() ||
        (item.product_id ? productImagesById.get(item.product_id) : null) ||
        null,
      quantity: toNumber(item.quantity),
      subtotal: toNumber(item.subtotal),
      variants: variantsByOrderItem.get(item.id) ?? [],
    })
    productsByOrderId.set(item.order_id, products)
  }

  const orders: OrderListItem[] = orderRows.map((order) => ({
    id: order.id,
    orderId: order.order_id,
    createdAt: order.created_at,
    staffName: user.full_name,
    shopId: order.shop_id,
    shopName: shopNameById.get(order.shop_id) ?? "Shop unavailable",
    productsCount: toNumber(order.products_count),
    totalAmount: Math.max(
      0,
      toNumber(order.estimated_total) -
        toNumber(order.deducted_amount) -
        toNumber(order.refund_amount)
    ),
    parcelsDelivered: toNumber(order.parcels_delivered),
    status: order.status ?? "pending",
    products: productsByOrderId.get(order.id) ?? [],
  }))

  return (
    <AppSidebar user={user}>
      <OrdersTable orders={orders} shops={shops} />
    </AppSidebar>
  )
}
