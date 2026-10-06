"use client"

import Image, { type StaticImageData } from "next/image"
import Link from "next/link"

export type ProductCategory = {
  id: string
  name: string
  description: string
  image: StaticImageData | string
}

export function CategoryCard({ category }: { category: ProductCategory }) {
  return (
    <article className="min-w-0 lg:w-[150px] lg:shrink-0">
      <Link
        href={`/products?category=${encodeURIComponent(category.name)}`}
        aria-label={`View ${category.name}`}
      >
        <div className="group relative aspect-square overflow-hidden rounded-xl lg:rounded-none">
          <Image
            src={category.image}
            alt={category.name}
            fill
            sizes="(min-width: 1024px) 150px, (min-width: 640px) 30vw, 45vw"
            className="object-cover transition duration-500 group-hover:scale-105 group-hover:grayscale"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#192d4a]/75 via-[#192d4a]/25 to-transparent px-3 pt-10 pb-3 lg:hidden">
            <h2 className="truncate text-sm font-semibold text-white">
              {category.name}
            </h2>
          </div>
          <div className="pointer-events-none absolute inset-0 hidden items-center justify-center px-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 lg:flex">
            <h2 className="text-center text-sm font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
              {category.name}
            </h2>
          </div>
        </div>
      </Link>
    </article>
  )
}
