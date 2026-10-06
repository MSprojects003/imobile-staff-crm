export type CreateOrderInput = {
  shopId: string
  isNegotiablePrice: boolean
  deductedAmount: number
  negotiableReason: string | null
}

export type CreatedOrder = {
  orderId: string
  shopName: string
  estimatedTotal: number
  fullTotal: number
  deductedAmount: number
  finalTotal: number
  productsCount: number
  smsDelivery: {
    sent: number
    failed: number
    adminFailed: number
    shopFailed: boolean
  }
}

export async function createOrder(input: CreateOrderInput) {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  const result = (await response.json()) as CreatedOrder | { error: string }

  if (!response.ok) {
    throw new Error(
      "error" in result
        ? result.error
        : `Unable to place order (HTTP ${response.status}).`
    )
  }
  if (!("orderId" in result) || !("smsDelivery" in result)) {
    throw new Error("Order creation returned an invalid response.")
  }
  return result
}
