import { useQuery } from "@tanstack/react-query"

import { createSupabaseBrowserClient } from "@/lib/supabase/browser"

export type Category = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  is_deleted: boolean
  created_at: string
}

export async function fetchCategories(): Promise<Category[]> {
  const supabase = createSupabaseBrowserClient()
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, description, image_url, is_deleted, created_at")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Unable to load categories: ${error.message}`)
  }

  return data ?? []
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  })
}
