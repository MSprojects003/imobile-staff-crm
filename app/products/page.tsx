import { redirect } from "next/navigation"
import { Suspense } from "react"

import { CategoryPage } from "@/components/custom/products/category/category-page"
import {
  ProductList,
  ProductListSkeleton,
} from "@/components/custom/products/product-list"
import { ProductFilters } from "@/components/custom/products/product-filters"
import { FooterPagination } from "@/components/custom/dashboard/Footer-pagination"
import {
  getCategory,
  productCategories,
} from "@/components/custom/products/product-data"
import { AppSidebar } from "@/components/custom/dashboard/app-sidebar"
import { getCurrentUser } from "@/lib/auth"
import {
  fetchProducts,
  type SupabaseProduct,
} from "@/lib/api/products"
import { getProductPrice } from "@/lib/api/product-utils"

export const dynamic = "force-dynamic"

type ProductSearchParams = {
  category?: string
  categories?: string
  brands?: string
  page?: string
}

async function ProductPagination({
  searchParams,
}: {
  searchParams: Promise<ProductSearchParams>
}) {
  const params = await searchParams
  const products = await fetchProducts()
  const selectedCategory = params.category
  const selectedCategories = params.categories?.split(",").filter(Boolean) ?? []
  const selectedBrands = params.brands?.split(",").filter(Boolean) ?? []
  const categoryIds = selectedCategories.length
    ? selectedCategories
    : selectedCategory
      ? [selectedCategory]
      : []
  const visibleProducts = products.filter(
    (product) =>
      (categoryIds.length === 0 ||
        categoryIds.some((category) =>
          product.category.toLowerCase() === category.toLowerCase()
        ) ||
        categoryIds.some(
          (categoryId) =>
            getCategory(categoryId)?.name.toLowerCase() ===
            product.category.toLowerCase()
        )) &&
      (selectedBrands.length === 0 || selectedBrands.includes(product.brand))
  )
  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(visibleProducts.length / pageSize))
  const currentPage = Math.min(
    Math.max(Number.parseInt(params.page ?? "1", 10) || 1, 1),
    totalPages
  )
  const hasProductFilters =
    Boolean(selectedCategory) ||
    selectedCategories.length > 0 ||
    selectedBrands.length > 0

  if (!hasProductFilters) {
    return null
  }

  return (
    <FooterPagination
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={visibleProducts.length}
      pageSize={pageSize}
      hideAtBottom={hasProductFilters}
    />
  )
}

async function ProductContent({
  searchParams,
}: {
  searchParams: Promise<ProductSearchParams>
}) {
  const products = await fetchProducts()
  const {
    category: categoryId,
    categories: categoryParam,
    brands: brandParam,
    page: pageParam,
  } = await searchParams
  const selectedCategory = categoryId
  const selectedCategories = categoryParam?.split(",").filter(Boolean) ?? []
  const selectedBrands = brandParam?.split(",").filter(Boolean) ?? []
  const categoryIds = selectedCategories.length
    ? selectedCategories
    : selectedCategory
      ? [selectedCategory]
      : []
  const activeCategoryNames = categoryIds.map(
    (categoryId) =>
      productCategories.find(
        (category) =>
          category.id === categoryId ||
          category.name.toLowerCase() === categoryId.toLowerCase()
      )?.name ?? categoryId
  )
  const categoryLabel =
    activeCategoryNames.length > 2
      ? `${activeCategoryNames.slice(0, 2).join(", ")} & ${activeCategoryNames.length - 2} more`
      : activeCategoryNames.join(", ")
  const visibleProducts = products.filter(
    (product) =>
      (categoryIds.length === 0 ||
        categoryIds.some((category) =>
          product.category.toLowerCase() === category.toLowerCase()
        ) ||
        categoryIds.some(
          (categoryId) =>
            getCategory(categoryId)?.name.toLowerCase() ===
            product.category.toLowerCase()
        )) &&
      (selectedBrands.length === 0 || selectedBrands.includes(product.brand))
  )
  const productsPerPage = 10
  const totalPages = Math.max(
    1,
    Math.ceil(visibleProducts.length / productsPerPage)
  )
  const currentPage = Math.min(
    Math.max(Number.parseInt(pageParam ?? "1", 10) || 1, 1),
    totalPages
  )
  const paginatedProducts = visibleProducts.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  ).map(toProductCardData)
  const hasProductFilters =
    Boolean(selectedCategory) ||
    selectedCategories.length > 0 ||
    selectedBrands.length > 0

  return hasProductFilters ? (
    <section className="mx-auto mt-5 w-full max-w-[1500px] pb-20 lg:mt-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {categoryLabel ? (
            <div className="flex items-center gap-4">
              
              <span className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-[#e7242b]">
                {categoryLabel}
              </span><span className="h-px w-10 shrink-0 bg-[#e7242b]" />
            </div>
          ) : null}
          <h1 className="mt-2 truncate text-2xl leading-none font-semibold tracking-[-0.03em] text-[#171717] sm:text-4xl lg:text-3xl">
            Products
          </h1>
        </div>
        <ProductFilters
          categories={productCategories}
          brands={[...new Set(products.map((product) => product.brand))]}
          className="w-full shrink-0 justify-start sm:w-auto sm:justify-end"
        />
      </div>
      <ProductList products={paginatedProducts} />
    </section>
  ) : (
    <CategoryPage />
  )
}

function toProductCardData(product: SupabaseProduct) {
  const firstImage = product.images[0] ?? "/assets/phones-banner.png"

  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    price: getProductPrice(product),
    categoryId: product.category,
    createdAt: product.created_at,
    frontImage: firstImage,
    backImage: product.images[1],
    description: product.description,
    specifications: product.specifications,
    originalPrice:
      product.old_price !== null
        ? `Rs. ${product.old_price.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        : undefined,
    discountPercent:
      product.discount_percentage && product.discount_percentage > 0
        ? product.discount_percentage
        : undefined,
  }
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<ProductSearchParams>
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <AppSidebar
      user={user}
      footer={
        <ProductPagination searchParams={searchParams} />
      }
    >
      <Suspense fallback={<ProductListSkeleton />}>
        <ProductContent searchParams={searchParams} />
      </Suspense>
    </AppSidebar>
  )
}
