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

const rangeLabels: Record<ProductRange, string> = {
  week: "This week",
  month: "This month",
  "six-months": "Last 6 months",
  year: "This year",
}

const productsByRange: Record<ProductRange, TopProduct[]> = {
  week: [
    { id: "iphone-15", name: "iPhone 15", sold: 45, image: phonesBanner },
    { id: "samsung-a54", name: "Samsung Galaxy A54", sold: 32, image: phonesBanner },
    { id: "redmi-note-13", name: "Redmi Note 13", sold: 28, image: phonesBanner },
    { id: "oneplus-nord-2", name: "OnePlus Nord 2", sold: 19, image: phonesBanner },
  ],
  month: [
    { id: "iphone-15", name: "iPhone 15", sold: 182, image: phonesBanner },
    { id: "samsung-a54", name: "Samsung Galaxy A54", sold: 146, image: phonesBanner },
    { id: "redmi-note-13", name: "Redmi Note 13", sold: 124, image: phonesBanner },
    { id: "oneplus-nord-2", name: "OnePlus Nord 2", sold: 98, image: phonesBanner },
  ],
  "six-months": [
    { id: "iphone-15", name: "iPhone 15", sold: 864, image: phonesBanner },
    { id: "samsung-a54", name: "Samsung Galaxy A54", sold: 731, image: phonesBanner },
    { id: "redmi-note-13", name: "Redmi Note 13", sold: 645, image: phonesBanner },
    { id: "oneplus-nord-2", name: "OnePlus Nord 2", sold: 528, image: phonesBanner },
  ],
  year: [
    { id: "iphone-15", name: "iPhone 15", sold: 1724, image: phonesBanner },
    { id: "samsung-a54", name: "Samsung Galaxy A54", sold: 1489, image: phonesBanner },
    { id: "redmi-note-13", name: "Redmi Note 13", sold: 1298, image: phonesBanner },
    { id: "oneplus-nord-2", name: "OnePlus Nord 2", sold: 1106, image: phonesBanner },
  ],
}

export function TopProduct() {
  const [range, setRange] = React.useState<ProductRange>("week")
  const products = productsByRange[range]

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
          {products.map((product) => (
            <TopProductCard key={product.id} product={product} />
          ))}
        </CardContent>
      </Card>
    </section>
  )
}
