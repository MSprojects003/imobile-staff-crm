"use client"

import { useCategories } from "@/lib/api/category"
import { Skeleton } from "@/components/ui/skeleton"

import { CategoryCard } from "./category-card"

export function CategoryPage() {
  const { data: categories, isLoading, isError } = useCategories()

  if (isLoading) {
    return (
      <section className="mx-auto mt-5 w-full max-w-[1500px] lg:mt-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:flex lg:flex-wrap lg:gap-8">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton
              key={index}
              className="aspect-square w-full sm:w-[150px]"
            />
          ))}
        </div>
      </section>
    )
  }

  if (isError) {
    return (
      <p className="mx-auto mt-8 max-w-[1500px] text-sm text-[#c51e27]">
        Unable to load product categories. Please try again.
      </p>
    )
  }

  return (
    <section className="mx-auto mt-5 w-full max-w-[1500px] lg:mt-8">
      <div className="mb-7">
        <div className="flex items-center gap-3">
          <span className="h-px w-14 shrink-0 bg-[#e7242b]" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e7242b]">
            Explore our collection
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#171717] sm:text-4xl">
          Product Categories
        </h1>
        <p className="mt-2 max-w-xl text-sm text-[#7a8490]">
          Browse our products by category and find what you need quickly.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:flex lg:flex-wrap lg:gap-8">
        {categories?.map((category) => (
          <CategoryCard
            key={category.id}
            category={{
              ...category,
              description: category.description ?? "",
              image: category.image_url ?? "/assets/phones-banner.png",
            }}
          />
        ))}
      </div>
    </section>
  )
}
