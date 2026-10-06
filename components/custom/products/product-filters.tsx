"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "cn"
import { useCategories } from "@/lib/api/category"
import { useBrands } from "@/lib/api/brand"

type FilterOption = {
  id: string
  name: string
}

type ProductFiltersProps = {
  categories: FilterOption[]
  brands: string[]
  className?: string
}

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
}

function FilterOption({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[#526274] hover:bg-[#fff1f1]"
      onClick={onChange}
    >
      <Checkbox checked={checked} />
      <span className="truncate">{label}</span>
    </button>
  )
}

export function ProductFilters({
  categories,
  brands,
  className,
}: ProductFiltersProps) {
  const { data: fetchedCategories } = useCategories()
  const { data: fetchedBrands } = useBrands()
  const filterCategories = fetchedCategories ?? categories
  const filterBrands = fetchedBrands?.map((brand) => brand.name) ?? brands
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get("category")
  const categoryValues =
    searchParams.get("categories")?.split(",").filter(Boolean) ??
    (categoryParam ? [categoryParam] : [])
  const brandValues = searchParams.get("brands")?.split(",").filter(Boolean) ?? []

  function updateFilter(key: "categories" | "brands", value: string) {
    const currentValues = key === "categories" ? categoryValues : brandValues
    const nextValues = value === "all" ? [] : toggleValue(currentValues, value)
    const params = new URLSearchParams(searchParams.toString())

    if (key === "categories") {
      params.delete("category")
    }
    params.delete("page")

    if (nextValues.length > 0) {
      params.set(key, nextValues.join(","))
    } else {
      params.delete(key)
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const selectedCategoryNames = filterCategories
    .filter(
      (category) =>
        categoryValues.includes(category.name) ||
        categoryValues.includes(category.id)
    )
    .map((category) => category.name)
  const selectedBrandNames = filterBrands.filter((brand) => brandValues.includes(brand))

  return (
    <div className={cn("flex flex-wrap items-center justify-end gap-2", className)}>
      <Select
        value={categoryValues.length > 0 ? categoryValues[0] : "all"}
        onValueChange={() => undefined}
      >
        <SelectTrigger
          aria-label="Filter by category"
          className="h-8 w-[125px] border-[#c7d0d9] bg-white text-[11px] text-[#526274] sm:h-9 sm:w-[150px] sm:text-xs"
        >
          <SelectValue>
            {selectedCategoryNames.length > 0
              ? `${selectedCategoryNames.length} categories`
              : "Categories"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="border border-[#e1e7ec] bg-white p-1">
          <FilterOption
            label="All categories"
            checked={categoryValues.length === 0}
            onChange={() => updateFilter("categories", "all")}
          />
          {filterCategories.map((category) => (
            <FilterOption
              key={category.id}
              label={category.name}
              checked={
                categoryValues.includes(category.name) ||
                categoryValues.includes(category.id)
              }
              onChange={() => updateFilter("categories", category.name)}
            />
          ))}
        </SelectContent>
      </Select>

      <Select
        value={brandValues.length > 0 ? brandValues[0] : "all"}
        onValueChange={() => undefined}
      >
        <SelectTrigger
          aria-label="Filter by brand"
          className="h-8 w-[110px] border-[#c7d0d9] bg-white text-[11px] text-[#526274] sm:h-9 sm:w-[130px] sm:text-xs"
        >
          <SelectValue>
            {selectedBrandNames.length > 0
              ? `${selectedBrandNames.length} brands`
              : "Brands"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="border border-[#e1e7ec] bg-white p-1">
          <FilterOption
            label="All brands"
            checked={brandValues.length === 0}
            onChange={() => updateFilter("brands", "all")}
          />
          {filterBrands.map((brand) => (
            <FilterOption
              key={brand}
              label={brand}
              checked={brandValues.includes(brand)}
              onChange={() => updateFilter("brands", brand)}
            />
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
