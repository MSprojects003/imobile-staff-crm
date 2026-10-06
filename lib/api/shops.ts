export type CreateShopInput = {
  name: string
  owner: string
  address1: string
  area: string
  phone_number: string
  email: string | null
  images: File[]
}

export type CreatedShop = {
  id: string
  name: string
  smsDelivery?: {
    sent: number
    failed: number
    adminFailed: number
    shopFailed: boolean
  }
}

export async function createShop(shop: CreateShopInput): Promise<CreatedShop> {
  const formData = new FormData()
  formData.set("name", shop.name)
  formData.set("owner", shop.owner)
  formData.set("address1", shop.address1)
  formData.set("area", shop.area)
  formData.set("phone_number", shop.phone_number)
  formData.set("email", shop.email ?? "")
  shop.images.forEach((image) => formData.append("images", image))

  const response = await fetch("/api/shops", {
    method: "POST",
    body: formData,
  })
  const result = (await response.json()) as CreatedShop | { error: string }

  if (!response.ok) {
    throw new Error(
      "error" in result
        ? result.error
        : `Unable to create shop (HTTP ${response.status}).`
    )
  }

  if (!("id" in result) || !("name" in result)) {
    throw new Error("Shop creation returned an invalid response.")
  }

  if (result.smsDelivery?.failed) {
    console.error(
      `Shop created, but Notify.lk failed to send ${result.smsDelivery.failed} admin SMS message(s).`
    )
  }

  return result
}
