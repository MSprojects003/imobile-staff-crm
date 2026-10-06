import { notFound, redirect } from "next/navigation"

import { AppSidebar } from "@/components/custom/dashboard/app-sidebar"
import { getCurrentUser } from "@/lib/auth"
import { fetchProductById } from "@/lib/api/products"

import { ProductDetails } from "./product-details"

export const dynamic = "force-dynamic"

export default async function ProductDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const { id } = await params
  const product = await fetchProductById(id)

  if (!product) {
    notFound()
  }

  return (
    <AppSidebar user={user} productName={product.name}>
      <ProductDetails product={product} />
    </AppSidebar>
  )
}
