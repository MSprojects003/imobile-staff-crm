"use client"

import Image from "next/image"
import * as React from "react"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useActiveProducts } from "@/lib/api/products-client"
import { getProductPrice } from "@/lib/api/product-utils"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const inputClassName =
  "h-10 rounded-lg border-[#c7d0d9] bg-white pl-9 text-sm text-[#192d4a] shadow-[0_1px_2px_rgba(25,45,74,0.04)] placeholder:text-[#8997a5] hover:border-[#aebbc8] focus-visible:border-[#e7242b] focus-visible:ring-[#e7242b]/15"

function SearchInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#99a5af]" />
      <Input
        aria-label="Search products and orders"
        placeholder="Search products, orders..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
      />
    </div>
  )
}

function ProductResults({
  query,
  className,
}: {
  query: string
  className?: string
}) {
  const { data: products, isLoading, isError } = useActiveProducts()
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return null
  }

  const matches =
    products?.filter((product) =>
      `${product.name} ${product.brand} ${product.sku}`
        .toLowerCase()
        .includes(normalizedQuery)
    ) ?? []

  return (
    <div
      className={`mt-2 overflow-hidden rounded-lg border border-[#edf0f2] bg-white shadow-lg ${className ?? ""}`}
    >
      {isLoading ? (
        <div className="space-y-3 p-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-md" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <p className="px-3 py-4 text-center text-sm text-[#c51e27]">
          Unable to load products.
        </p>
      ) : matches.length > 0 ? (
        <div className="divide-y divide-[#f0f2f4]">
          {matches.map((product) => (
            <button
              key={product.id}
              type="button"
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[#fff8f8]"
            >
              <Image
                src={product.images[0] ?? "/assets/phones-banner.png"}
                alt=""
                width={42}
                height={42}
                unoptimized
                className="size-10 rounded-md bg-[#f8fafb] object-cover"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-[#192d4a]">
                  {product.name}
                </span>
                <span className="mt-0.5 block text-xs font-semibold text-[#e7242b]">
                  {getProductPrice(product)}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="px-3 py-4 text-center text-sm text-[#8795a3]">
          No products found.
        </p>
      )}
    </div>
  )
}

export function SearchBar() {
  const [query, setQuery] = React.useState("")

  return (
    <>
      <div className="relative hidden w-full max-w-sm md:block">
        <SearchInput value={query} onChange={setQuery} />
        <ProductResults
          query={query}
          className="absolute top-full right-0 left-0 z-50"
        />
      </div>
      <Sheet>
        <SheetTrigger
          className="flex size-9 items-center justify-center rounded-lg text-[#526274] transition hover:bg-[#fff1f1] hover:text-[#e7242b] md:hidden"
          aria-label="Open search"
        >
          <Search className="size-[19px]" />
        </SheetTrigger>
        <SheetContent
          side="top"
          showCloseButton
          className="gap-0 border-b border-[#edf0f2] bg-white px-4 pt-3 pb-5 shadow-md"
        >
          <SheetHeader className="px-0 pb-3">
            <SheetTitle className="text-left text-base text-[#192d4a]">
              Search
            </SheetTitle>
            <SheetDescription className="text-left text-xs text-[#8795a3]">
              Find products and orders quickly.
            </SheetDescription>
          </SheetHeader>
          <SearchInput value={query} onChange={setQuery} />
          <ProductResults query={query} />
        </SheetContent>
      </Sheet>
    </>
  )
}
