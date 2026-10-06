import { redirect } from "next/navigation"

import { LeftSection } from "@/components/custom/dashboard/cart/leftsection"
import { AppSidebar } from "@/components/custom/dashboard/app-sidebar"
import { getCurrentUser } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export default async function CartPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const adminClient = createSupabaseAdminClient()
  const { data: shops, error } = await adminClient
    .from("shops")
    .select("id, name")
    .eq("is_active", true)
    .eq("is_deleted", false)
    .order("name", { ascending: true })

  if (error) {
    throw new Error(`Unable to load shops for the cart: ${error.message}`)
  }

  return (
    <AppSidebar user={user}>
      <LeftSection
        shops={(shops ?? []).map((shop) => ({
          id: shop.id,
          full_name: shop.name,
        }))}
        staffName={user.full_name}
      />
    </AppSidebar>
  )
}
