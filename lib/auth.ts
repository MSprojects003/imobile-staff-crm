import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    throw error
  }

  if (!user?.phone) return null

  const adminClient = createSupabaseAdminClient()
  const { data: profiles, error: profileError } = await adminClient
    .from("users")
    .select("id, full_name, username, phone")
    .eq("status", true)
    .eq("is_rep", true)
    .eq("is_admin", false)
    .eq("is_sub_admin", false)
    .eq("is_shop", false)

  if (profileError) throw profileError
  const normalizedAuthPhone = user.phone.replace(/\D/g, "")
  return (
    profiles?.find(
      (profile) => profile.phone.replace(/\D/g, "") === normalizedAuthPhone
    ) ?? null
  )
}
