import { redirect } from "next/navigation"

import { AppSidebar } from "@/components/custom/dashboard/app-sidebar"
import { LineChart } from "@/components/custom/dashboard/LineChart"
import { StatCards } from "@/components/custom/dashboard/StatCards"
import { TopProduct } from "@/components/custom/dashboard/top-product"
import type { TopProductSale } from "@/components/custom/dashboard/top-product"
import { getCurrentUser } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const QUERY_PAGE_SIZE = 1000

type ActiveProductRow = {
  id: string
  name: string
  images: string[] | null
}

type DeliveredOrderRow = {
  id: string
  created_at: string
}

type OrderItemRow = {
  id: string
  order_id: string
  product_id: string
  quantity: number
  subtotal: number | string
}

type SubOrderItemRow = {
  order_item_id: string
  quantity: number
  subtotal: number | string
  status: string
}

async function fetchAllRows<T>(
  fetchPage: (
    from: number,
    to: number
  ) => PromiseLike<{
    data: T[] | null
    error: { message: string } | null
  }>,
  errorMessage: string
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += QUERY_PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + QUERY_PAGE_SIZE - 1)
    if (error) {
      throw new Error(`${errorMessage}: ${error.message}`)
    }

    const page = data ?? []
    rows.push(...page)
    if (page.length < QUERY_PAGE_SIZE) return rows
  }
}

export default async function Page() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const now = new Date()
  const adminClient = createSupabaseAdminClient()
  const [
    { data: monthlyTarget, error: monthlyTargetError },
    { count: activeProductCount, error: productsError },
    { count: shopCount, error: shopsError },
    { data: staffData, error: staffError },
  ] = await Promise.all([
    adminClient
      .from("monthly_targets")
      .select("target_amount, achieved_amount")
      .eq("staff_id", user.id)
      .eq("month", now.getMonth() + 1)
      .eq("year", now.getFullYear())
      .maybeSingle(),
    adminClient
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("isactive", true),
    adminClient.from("shops").select("id", { count: "exact", head: true }),
    adminClient
      .from("staff")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .eq("is_deleted", false),
  ])

  if (monthlyTargetError) {
    throw new Error(
      `Unable to load this month's target: ${monthlyTargetError.message}`
    )
  }
  if (productsError) {
    throw new Error(`Unable to count active products: ${productsError.message}`)
  }
  if (shopsError) {
    throw new Error(`Unable to count shops: ${shopsError.message}`)
  }
  if (staffError) {
    throw new Error(`Unable to resolve the current staff record: ${staffError.message}`)
  }

  const staffIds = ((staffData ?? []) as { id: string }[]).map(
    (staff) => staff.id
  )
  const orderOwnerIds = [...new Set([...staffIds, user.id])]
  const { data: deliveredOrders, error: deliveredOrdersError } =
    await adminClient
      .from("orders")
      .select("full_total")
      .in("user_id", orderOwnerIds)
      .eq("status", "delivered")

  if (deliveredOrdersError) {
    throw new Error(
      `Unable to load delivered order sales: ${deliveredOrdersError.message}`
    )
  }

  const deliveredSales = (deliveredOrders ?? []).reduce(
    (total, order) => total + Number(order.full_total ?? 0),
    0
  )

  const chartRangeStart = new Date(now.getFullYear(), 0, 1)
  const sixMonthRangeStart = new Date(
    now.getFullYear(),
    now.getMonth() - 5,
    1
  )
  const earliestProductSalesDate =
    chartRangeStart < sixMonthRangeStart
      ? chartRangeStart
      : sixMonthRangeStart

  const [activeProducts, deliveredSalesOrders] = await Promise.all([
    fetchAllRows<ActiveProductRow>(
      (from, to) =>
        adminClient
          .from("products")
          .select("id, name, images")
          .eq("isactive", true)
          .order("id")
          .range(from, to),
      "Unable to load active products for sales analysis"
    ),
    fetchAllRows<DeliveredOrderRow>(
      (from, to) =>
        adminClient
          .from("orders")
          .select("id, created_at")
          .eq("status", "delivered")
          .gte("created_at", earliestProductSalesDate.toISOString())
          .lte("created_at", now.toISOString())
          .order("created_at")
          .range(from, to),
      "Unable to load delivered orders for top-product analysis"
    ),
  ])

  const orderIds = deliveredSalesOrders.map((order) => order.id)
  const orderItems: OrderItemRow[] = []
  for (let index = 0; index < orderIds.length; index += 100) {
    const currentOrderIds = orderIds.slice(index, index + 100)
    orderItems.push(
      ...(await fetchAllRows<OrderItemRow>(
        (from, to) =>
          adminClient
            .from("order_items")
            .select("id, order_id, product_id, quantity, subtotal")
            .in("order_id", currentOrderIds)
            .order("id")
            .range(from, to),
        "Unable to load delivered order products"
      ))
    )
  }

  const subOrderItems: SubOrderItemRow[] = []
  for (let index = 0; index < orderItems.length; index += 100) {
    const orderItemIds = orderItems.slice(index, index + 100).map((item) => item.id)
    subOrderItems.push(
      ...(await fetchAllRows<SubOrderItemRow>(
        (from, to) =>
          adminClient
            .from("sub_order_items")
            .select("order_item_id, quantity, subtotal, status")
            .in("order_item_id", orderItemIds)
            .order("order_item_id")
            .range(from, to),
        "Unable to load delivered product variant sales"
      ))
    )
  }

  const productById = new Map(
    activeProducts.map((product) => [product.id, product])
  )
  const orderDateById = new Map(
    deliveredSalesOrders.map((order) => [order.id, order.created_at])
  )
  const variantsByOrderItemId = new Map<string, SubOrderItemRow[]>()
  for (const item of subOrderItems) {
    const variants = variantsByOrderItemId.get(item.order_item_id) ?? []
    variants.push(item)
    variantsByOrderItemId.set(item.order_item_id, variants)
  }

  const topProductSales: TopProductSale[] = []
  for (const item of orderItems) {
    const product = productById.get(item.product_id)
    const createdAt = orderDateById.get(item.order_id)
    if (!product || !createdAt) continue

    const variants = variantsByOrderItemId.get(item.id)
    if (variants?.length) {
      for (const variant of variants) {
        if (variant.status === "no_items") continue
        topProductSales.push({
          productId: product.id,
          name: product.name,
          image: product.images?.find((image) => image.trim()) ?? null,
          createdAt,
          amount: Number(variant.subtotal),
          quantity: Number(variant.quantity),
        })
      }
    } else {
      topProductSales.push({
        productId: product.id,
        name: product.name,
        image: product.images?.find((image) => image.trim()) ?? null,
        createdAt,
        amount: Number(item.subtotal),
        quantity: Number(item.quantity),
      })
    }
  }

  const { data: chartOrders, error: chartOrdersError } = await adminClient
    .from("orders")
    .select("created_at, full_total")
    .in("user_id", orderOwnerIds)
    .eq("status", "delivered")
    .gte("created_at", earliestProductSalesDate.toISOString())
    .lte("created_at", now.toISOString())

  if (chartOrdersError) {
    throw new Error(
      `Unable to load delivered sales analysis: ${chartOrdersError.message}`
    )
  }

  const daysInCurrentMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate()
  const currentWeek = Math.min(
    4,
    Math.ceil((now.getDate() / daysInCurrentMonth) * 4)
  )

  return (
    <AppSidebar user={user}>
      <div className="mx-auto w-full max-w-[1500px]">
        <h1 className="text-lg font-bold tracking-tight text-[#192d4a] sm:text-xl md:hidden">
          Dashboard
        </h1>
        <p className="mt-0.5 text-[11px] text-[#7a8490] sm:text-xs md:hidden">
          Overview of your daily performance
        </p>
        <StatCards
          monthlyTarget={{
            targetAmount: Number(monthlyTarget?.target_amount ?? 0),
            achievedAmount: Number(monthlyTarget?.achieved_amount ?? 0),
            currentWeek,
          }}
          liveStats={{
            totalProducts: activeProductCount ?? 0,
            totalShops: shopCount ?? 0,
            deliveredSales,
          }}
        />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <LineChart
            orders={(chartOrders ?? []).map((order) => ({
              createdAt: order.created_at,
              total: Number(order.full_total ?? 0),
            }))}
          />
          <TopProduct sales={topProductSales} />
        </div>
      </div>
    </AppSidebar>
  )
}
