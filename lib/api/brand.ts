import { useQuery } from "@tanstack/react-query"

import { createSupabaseBrowserClient } from "@/lib/supabase/browser"

export type Brand = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  is_deleted: boolean
  created_at: string
}

export async function fetchBrands(): Promise<Brand[]> {
  const supabase = createSupabaseBrowserClient()
  const { data, error } = await supabase
    .from("brands")
    .select("id, name, description, image_url, is_deleted, created_at")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Unable to load brands: ${error.message}`)
  }

  return data ?? []
}

export function useBrands() {
  return useQuery({
    queryKey: ["brands"],
    queryFn: fetchBrands,
  })
}
