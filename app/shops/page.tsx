import { redirect } from "next/navigation"

import { AppSidebar } from "@/components/custom/dashboard/app-sidebar"
import {
  ShopDirectoryFooter,
  ShopDirectory,
  type ShopDirectoryItem,
} from "@/components/custom/shops/card"
import { getCurrentUser } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

type ShopRow = {
  id: string
  name: string
  owner: string | null
  address1: string | null
  area: string | null
  phone_number: string | null
  email: string | null
  images: string[] | null
  created_by_staff_id: string | null
}

type StaffRow = {
  id: string
  user_id: string
}

type UserRow = {
  id: string
  full_name: string | null
}

export default async function ShopsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const adminClient = createSupabaseAdminClient()
  const { data: shopData, error: shopsError } = await adminClient
    .from("shops")
    .select(
      "id, name, owner, address1, area, phone_number, email, images, created_by_staff_id"
    )
    .eq("is_active", true)
    .eq("is_deleted", false)
    .order("name", { ascending: true })

  if (shopsError) {
    throw new Error(`Unable to load shops: ${shopsError.message}`)
  }

  const shopRows = (shopData ?? []) as ShopRow[]
  const staffIds = [
    ...new Set(
      shopRows.flatMap((shop) =>
        shop.created_by_staff_id ? [shop.created_by_staff_id] : []
      )
    ),
  ]
  const [
    { data: staffData, error: staffError },
    { data: currentStaffData, error: currentStaffError },
  ] = await Promise.all([
    staffIds.length > 0
      ? adminClient.from("staff").select("id, user_id").in("id", staffIds)
      : Promise.resolve({ data: [], error: null }),
    adminClient
      .from("staff")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .eq("is_deleted", false),
  ])

  if (staffError) {
    throw new Error(`Unable to load shop staff details: ${staffError.message}`)
  }
  if (currentStaffError) {
    throw new Error(
      `Unable to resolve your staff access for shops: ${currentStaffError.message}`
    )
  }

  const staffRows = (staffData ?? []) as StaffRow[]
  const profileIds = [...new Set(staffRows.map((staff) => staff.user_id))]
  const { data: userData, error: usersError } =
    profileIds.length > 0
      ? await adminClient
          .from("users")
          .select("id, full_name")
          .in("id", profileIds)
      : { data: [], error: null }

  if (usersError) {
    throw new Error(`Unable to load shop staff names: ${usersError.message}`)
  }

  const userNames = new Map(
    ((userData ?? []) as UserRow[]).map((profile) => [
      profile.id,
      profile.full_name?.trim() || "Staff member",
    ])
  )
  const staffNames = new Map(
    staffRows.map((staff) => [
      staff.id,
      userNames.get(staff.user_id) ?? "Staff member",
    ])
  )
  const currentStaffIds = new Set(
    ((currentStaffData ?? []) as { id: string }[]).map((staff) => staff.id)
  )
  const currentUserStaffIds = new Set(
    staffRows
      .filter((staff) => staff.user_id === user.id)
      .map((staff) => staff.id)
  )
  const shops: ShopDirectoryItem[] = shopRows.map((shop) => ({
    id: shop.id,
    name: shop.name,
    owner: shop.owner ?? "",
    address1: shop.address1 ?? "",
    area: shop.area ?? "",
    phoneNumber: shop.phone_number ?? "",
    email: shop.email ?? "",
    image: shop.images?.find((image) => image.trim())?.trim() ?? null,
    createdByStaffId: shop.created_by_staff_id,
    staffName: shop.created_by_staff_id
      ? (staffNames.get(shop.created_by_staff_id) ?? "Former staff")
      : "Unknown staff",
    createdByCurrentUser:
      shop.created_by_staff_id !== null &&
      currentUserStaffIds.has(shop.created_by_staff_id),
    canEdit:
      shop.created_by_staff_id !== null &&
      currentStaffIds.has(shop.created_by_staff_id),
  }))

  return (
    <AppSidebar user={user} footer={<ShopDirectoryFooter shops={shops} />}>
      <ShopDirectory shops={shops} />
    </AppSidebar>
  )
}
