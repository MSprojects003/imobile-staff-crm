import { createSupabaseServerClient } from "@/lib/supabase/server"

export type SupabaseProduct = {
  id: string
  sku: string
  name: string
  model_number: string
  model: string | null
  category: string
  brand: string
  manufactured_year: number | null
  description: string
  images: string[]
  specifications: string[]
  pricing_type: "fixed" | "bulk"
  fixed_price: number | null
  price_tiers: unknown
  colors: string[]
  stock: number
  isactive: boolean | null
  created_at: string
  updated_at: string
  discount_percentage: number | null
  discount_amount: number | null
  old_price: number | null
}

export async function fetchProducts(): Promise<SupabaseProduct[]> {
  const supabase = await createSupabaseServerClient()
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

export async function fetchProductById(
  id: string
): Promise<SupabaseProduct | null> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, sku, name, model_number, model, category, brand, manufactured_year, description, images, specifications, pricing_type, fixed_price, price_tiers, colors, stock, isactive, created_at, updated_at, discount_percentage, discount_amount, old_price"
    )
    .eq("id", id)
    .eq("isactive", true)
    .maybeSingle()

  if (error) {
    throw new Error(`Unable to load product details: ${error.message}`)
  }

  return data
}
