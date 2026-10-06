"use client"

import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"

import type { Product } from "./product-data"
import { ProductInfoTabs } from "./product-info-tabs"

const IMAGE_SIZES =
  "(min-width: 1280px) 220px, (min-width: 640px) 30vw, 45vw"
const NEW_PRODUCT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

function isNewProduct(createdAt?: string) {
  if (!createdAt) {
    return false
  }

  const createdTime = Date.parse(createdAt)
  const age = Date.now() - createdTime

  return (
    Number.isFinite(createdTime) &&
    age >= 0 &&
    age <= NEW_PRODUCT_WINDOW_MS
  )
}

export function ProductCard({ product }: { product: Product }) {
  const hasBackImage = Boolean(product.backImage)
  const isNew = isNewProduct(product.createdAt)

  return (
    <Card className="group overflow-hidden rounded-none bg-white py-0 shadow-[0_2px_12px_rgba(25,45,74,0.05)] outline-none transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(25,45,74,0.12)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-[#f8fafb21]">
          {isNew ? (
            <span className="absolute top-3 -right-8 z-10 w-28 origin-center rotate-45 bg-[#e7242b] py-1 text-center text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
              New
            </span>
          ) : null}
          <Image
            src={product.frontImage}
            alt={product.name}
            fill
            unoptimized
            sizes={IMAGE_SIZES}
            className={`object-cover transition-all duration-700 ease-in-out will-change-transform motion-reduce:transition-none ${
              hasBackImage
                ? "scale-100 opacity-100 group-hover:scale-105 group-hover:opacity-0"
                : "group-hover:scale-105"
            }`}
          />

          {hasBackImage && (
          <Image
            src={product.backImage ?? product.frontImage}
            alt=""
            aria-hidden="true"
            fill
            unoptimized
            sizes={IMAGE_SIZES}
            className="scale-105 object-cover opacity-0 transition-all duration-700 ease-in-out will-change-transform group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
          />
          )}
        </div>

        <CardContent className="space-y-1 px-3 pb-3 pt-3">
          <p className="truncate text-[10px] font-medium uppercase tracking-wide text-[#8795a3]">
            {product.brand}
          </p>
          <h2 className="truncate text-sm font-semibold text-[#192d4a] transition-colors duration-300">
            {product.name}
          </h2>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="text-sm font-normal text-[#e7242b]">{product.price}</p>
            {product.originalPrice && product.discountPercent ? (
              <>
                <p className="text-xs text-[#9aa5af] line-through">
                  {product.originalPrice}
                </p>
                <span className="text-[10px] font-semibold text-[#e7242b]">
                  {product.discountPercent}% OFF
                </span>
              </>
            ) : null}
          </div>
        </CardContent>
      </Link>

      <ProductInfoTabs
        description={product.description}
        specifications={product.specifications}
      />
    </Card>
  )
}