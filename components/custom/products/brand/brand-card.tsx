"use client"

import Image from "next/image"
import Link from "next/link"

import type { Brand } from "@/lib/api/brand"

export function BrandCard({ brand }: { brand: Brand }) {
  return (
    <article className="min-w-0 lg:w-[150px] lg:shrink-0">
      <Link
        href={`/brands?brands=${encodeURIComponent(brand.name)}`}
        aria-label={`View ${brand.name} products`}
      >
        <div className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-white p-5 shadow-sm transition hover:shadow-md lg:rounded-none">
          {brand.image_url ? (
            <Image
              src={brand.image_url}
              alt={brand.name}
              fill
              unoptimized
              sizes="(min-width: 1024px) 150px, (min-width: 640px) 30vw, 45vw"
              className="object-contain p-5 transition duration-300 group-hover:scale-105"
            />
          ) : (
            <span className="text-center text-lg font-semibold text-[#192d4a]">
              {brand.name}
            </span>
          )}
        </div>
        {brand.image_url ? (
          <h2 className="mt-2 truncate text-center text-sm font-semibold text-[#192d4a]">
            {brand.name}
          </h2>
        ) : null}
      </Link>
    </article>
  )
}
