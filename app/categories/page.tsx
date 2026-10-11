import ProductsPage from "../products/page"

export const dynamic = "force-dynamic"

type CategoriesSearchParams = {
  category?: string
  categories?: string
  brands?: string
  page?: string
}

export default function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<CategoriesSearchParams>
}) {
  return <ProductsPage searchParams={searchParams} />
}
