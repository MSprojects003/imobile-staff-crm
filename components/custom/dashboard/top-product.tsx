"use client"

import * as React from "react"
import phonesBanner from "@/public/assets/phones-banner.png"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TopProductCard, type TopProduct } from "./top-product-card"

type ProductRange = "week" | "month" | "six-months" | "year"

export type TopProductSale = {
  productId: string
  name: string
  image: string | null
  createdAt: string
  amount: number
  quantity: number
}

const rangeLabels: Record<ProductRange, string> = {
  week: "This week",
  month: "This month",
  "six-months": "Last 6 months",
  year: "This year",
}

function getRangeStart(range: ProductRange, now: Date) {
  if (range === "year") return new Date(now.getFullYear(), 0, 1)
  if (range === "six-months") {
    return new Date(now.getFullYear(), now.getMonth() - 5, 1)
  }
  if (range === "month") return new Date(now.getFullYear(), now.getMonth(), 1)

  const start = new Date(now)
  start.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  start.setHours(0, 0, 0, 0)
  return start
}

function formatSales(value: number) {
  return `Rs. ${value.toLocaleString("en-LK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

export function TopProduct({ sales }: { sales: TopProductSale[] }) {
  const [range, setRange] = React.useState<ProductRange>("week")
  const products = React.useMemo(() => {
    const now = new Date()
    const start = getRangeStart(range, now)
    const salesByProduct = new Map<
      string,
      Omit<TopProduct, "image"> & { image: string | null }
    >()

    for (const sale of sales) {
      const createdAt = new Date(sale.createdAt)
      if (createdAt < start || createdAt > now) continue

      const product =
        salesByProduct.get(sale.productId) ??
        {
          id: sale.productId,
          name: sale.name,
          image: sale.image,
          sold: 0,
          amount: 0,
        }
      product.sold += sale.quantity
      product.amount += sale.amount
      salesByProduct.set(sale.productId, product)
    }

    return [...salesByProduct.values()]
      .filter((product) => product.amount > 0)
      .sort(
        (first, second) =>
          second.amount - first.amount ||
          second.sold - first.sold ||
          first.name.localeCompare(second.name)
      )
      .slice(0, 5)
      .map((product) => ({
        ...product,
        image: product.image || phonesBanner,
      }))
  }, [range, sales])

  return (
    <section className="mt-5 w-full lg:w-[30%]" aria-labelledby="top-products-title">
      <Card className="border-[#e8edf1]  bg-white shadow-[0_2px_12px_rgba(25,45,74,0.04)]">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-[#edf0f2] px-4 py-2">
          <CardTitle
            id="top-products-title"
            className="text-sm font-semibold text-[#192d4a]"
          >
            Top Selling Products
          </CardTitle>
          <Select
            value={range}
            onValueChange={(value) => {
              if (value !== null) setRange(value as ProductRange)
            }}
          >
            <SelectTrigger className="h-8 w-[118px] border-[#c7d0d9] bg-white text-xs text-[#526274] shadow-none hover:border-[#aebbc8]">
              <SelectValue>{rangeLabels[range]}</SelectValue>
            </SelectTrigger>
            <SelectContent className="border border-[#e1e7ec] bg-white p-1 text-[#526274] shadow-[0_12px_30px_rgba(29,52,74,0.12)]">
              <SelectItem value="week" className="rounded-md text-xs">
                This week
              </SelectItem>
              <SelectItem value="month" className="rounded-md text-xs">
                This month
              </SelectItem>
              <SelectItem value="six-months" className="rounded-md text-xs">
                Last 6 months
              </SelectItem>
              <SelectItem value="year" className="rounded-md text-xs">
                This year
              </SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="px-4 py-0">
          {products.length > 0 ? (
            products.map((product) => (
              <TopProductCard
                key={product.id}
                product={product}
                formatSales={formatSales}
              />
            ))
          ) : (
            <p className="py-8 text-center text-xs text-[#8795a3]">
              No delivered product sales in this period.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
