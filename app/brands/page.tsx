import ProductsPage from "../products/page"

export const dynamic = "force-dynamic"

type BrandsSearchParams = {
  category?: string
  categories?: string
  brands?: string
  page?: string
}

export default function BrandsPage({
  searchParams,
}: {
  searchParams: Promise<BrandsSearchParams>
}) {
  return <ProductsPage searchParams={searchParams} browseBrands />
}
