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
  const profileFields =
    "id, full_name, username, phone, profile_image_url, is_rep"

  if (typeof user.app_metadata?.staff_user_id === "string") {
    const { data: profile, error: profileError } = await adminClient
      .from("users")
      .select(profileFields)
      .eq("id", user.app_metadata.staff_user_id)
      .eq("status", true)
      .eq("is_rep", true)
      .eq("is_admin", false)
      .eq("is_sub_admin", false)
      .eq("is_shop", false)
      .maybeSingle()

    if (profileError) throw profileError
    return profile
  }

  const { data: profiles, error: profileError } = await adminClient
    .from("users")
    .select(profileFields)
    .eq("status", true)
    .eq("is_rep", true)
    .eq("is_admin", false)
    .eq("is_sub_admin", false)
    .eq("is_shop", false)

  if (profileError) throw profileError
  const normalizedAuthPhone = user.phone.replace(/\D/g, "")
  return (
    profiles?.find(
      (profile) => profile.id === user.app_metadata?.staff_user_id
    ) ??
    profiles?.find(
      (profile) => profile.phone.replace(/\D/g, "") === normalizedAuthPhone
    ) ??
    null
  )
}
