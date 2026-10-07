import { notFound, redirect } from "next/navigation"

import { AppSidebar } from "@/components/custom/dashboard/app-sidebar"
import {
  OrderItemsTable,
  type OrderDetailData,
} from "@/components/custom/orders/details/table"
import { getCurrentUser } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

type OrderRow = {
  id: string
  order_id: string
  user_id: string
  shop_id: string
  products_count: number | string
  estimated_total: number | string
  deducted_amount: number | string | null
  refund_amount: number | string | null
  is_negotiable_price: boolean | null
  negotiable_reason: string | null
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
  status: string | null
}

type ProductImageRow = {
  id: string
  images: string[] | null
}

type SubOrderItemRow = {
  id: string
  order_item_id: string
  models: string[] | null
  colors: string[] | null
  quantity: number | string
  unit_price: number | string
  subtotal: number | string
  status: string | null
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const { id } = await params
  const adminClient = createSupabaseAdminClient()
  const { data: staffData, error: staffError } = await adminClient
    .from("staff")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .eq("is_deleted", false)

  if (staffError) {
    throw new Error(
      `Unable to resolve the current staff record: ${staffError.message}`
    )
  }

  const staffIds = ((staffData ?? []) as { id: string }[]).map(
    (staff) => staff.id
  )
  if (staffIds.length === 0) notFound()

  const { data: orderData, error: orderError } = await adminClient
    .from("orders")
    .select(
      "id, order_id, user_id, shop_id, products_count, estimated_total, deducted_amount, refund_amount, is_negotiable_price, negotiable_reason, status, created_at, parcels_delivered"
    )
    .eq("id", id)
    .in("user_id", staffIds)
    .maybeSingle()

  if (orderError) {
    throw new Error(`Unable to load order details: ${orderError.message}`)
  }
  if (!orderData) notFound()

  const order = orderData as OrderRow
  const [
    { data: shopData, error: shopError },
    { data: orderItemsData, error: orderItemsError },
  ] = await Promise.all([
    adminClient
      .from("shops")
      .select("id, name")
      .eq("id", order.shop_id)
      .maybeSingle(),
    adminClient
      .from("order_items")
      .select(
        "id, order_id, product_id, product_name, product_image, quantity, subtotal, status"
      )
      .eq("order_id", order.id),
  ])

  if (shopError) {
    throw new Error(`Unable to load order shop: ${shopError.message}`)
  }
  if (orderItemsError) {
    throw new Error(`Unable to load order items: ${orderItemsError.message}`)
  }

  const shop = shopData as ShopRow | null
  const orderItems = (orderItemsData ?? []) as OrderItemRow[]
  const productIdsMissingImages = [
    ...new Set(
      orderItems.flatMap((item) =>
        !item.product_image?.trim() && item.product_id
          ? [item.product_id]
          : []
      )
    ),
  ]
  const [variantResult, productImagesResult] = await Promise.all([
    orderItems.length > 0
      ? adminClient
          .from("sub_order_items")
          .select(
            "id, order_item_id, models, colors, quantity, unit_price, subtotal, status"
          )
          .in(
            "order_item_id",
            orderItems.map((item) => item.id)
          )
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
      `Unable to load order item selections: ${variantResult.error.message}`
    )
  }
  if (productImagesResult.error) {
    throw new Error(
      `Unable to load product images for order: ${productImagesResult.error.message}`
    )
  }

  const productImagesById = new Map(
    ((productImagesResult.data ?? []) as ProductImageRow[]).map((product) => [
      product.id,
      product.images?.find((image) => image.trim())?.trim() ?? null,
    ])
  )
  const variantsByItemId = new Map<
    string,
    OrderDetailData["products"][number]["variants"]
  >()
  for (const variant of (variantResult.data ?? []) as SubOrderItemRow[]) {
    const variants = variantsByItemId.get(variant.order_item_id) ?? []
    variants.push({
      id: variant.id,
      models: variant.models ?? [],
      colors: variant.colors ?? [],
      quantity: toNumber(variant.quantity),
      unitPrice: toNumber(variant.unit_price),
      subtotal: toNumber(variant.subtotal),
      status: variant.status ?? "pending",
    })
    variantsByItemId.set(variant.order_item_id, variants)
  }

  const details: OrderDetailData = {
    id: order.id,
    orderId: order.order_id,
    createdAt: order.created_at,
    shopId: order.shop_id,
    shopName: shop?.name ?? "Shop unavailable",
    productsCount: toNumber(order.products_count),
    parcelsDelivered: toNumber(order.parcels_delivered),
    status: order.status ?? "pending",
    estimatedTotal: toNumber(order.estimated_total),
    deductedAmount: toNumber(order.deducted_amount),
    refundAmount: toNumber(order.refund_amount),
    totalAmount: Math.max(
      0,
      toNumber(order.estimated_total) -
        toNumber(order.deducted_amount) -
        toNumber(order.refund_amount)
    ),
    isNegotiablePrice: order.is_negotiable_price ?? false,
    negotiableReason: order.negotiable_reason,
    products: orderItems.map((item) => ({
      id: item.id,
      productId: item.product_id,
      name: item.product_name,
      image:
        item.product_image?.trim() ||
        (item.product_id ? productImagesById.get(item.product_id) : null) ||
        null,
      quantity: toNumber(item.quantity),
      subtotal: toNumber(item.subtotal),
      status: item.status ?? "pending",
      variants: variantsByItemId.get(item.id) ?? [],
    })),
  }

  return (
    <AppSidebar user={user} orderId={details.orderId}>
      <OrderItemsTable order={details} />
    </AppSidebar>
  )
}
