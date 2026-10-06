import { useQuery } from "@tanstack/react-query"

import { createSupabaseBrowserClient } from "@/lib/supabase/browser"

import type { SupabaseProduct } from "./products"

export async function fetchActiveProducts(): Promise<SupabaseProduct[]> {
  const supabase = createSupabaseBrowserClient()
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, sku, name, model_number, model, category, brand, manufactured_year, description, images, specifications, pricing_type, fixed_price, price_tiers, colors, stock, isactive, created_at, updated_at, discount_percentage, discount_amount, old_price"
    )
    .eq("isactive", true)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Unable to load products: ${error.message}`)
  }

  return data ?? []
}

export function useActiveProducts() {
  return useQuery({
    queryKey: ["products", "active"],
    queryFn: fetchActiveProducts,
  })
}
