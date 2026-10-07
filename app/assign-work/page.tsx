import { Suspense } from "react"
import { redirect } from "next/navigation"

import { AppSidebar } from "@/components/custom/dashboard/app-sidebar"
import {
  AssignedWorkPagination,
  AssignedWorkTable,
} from "@/components/custom/assign-work/table"
import type { AssignedWork } from "@/components/custom/assign-work/types"
import { getCurrentUser } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

type StaffRow = {
  id: string
  user_id: string
}

type ProfileRow = {
  id: string
  full_name: string | null
}

type AssignedWorkRow = {
  id: string
  staff_id: string
  shop_id: string
  message: string | null
  progress: string
  created_at: string
}

type ShopRow = {
  id: string
  name: string
  area: string | null
}

export default async function AssignWorkPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const adminClient = createSupabaseAdminClient()
  const { data: staffData, error: staffError } = await adminClient
    .from("staff")
    .select("id, user_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .eq("is_deleted", false)

  if (staffError) {
    throw new Error(
      `Unable to resolve your staff profile: ${staffError.message}`
    )
  }

  const staffRows = (staffData ?? []) as StaffRow[]
  const staffIds = staffRows.map((staff) => staff.id)
  let assignmentRows: AssignedWorkRow[] = []
  if (staffIds.length > 0) {
    const { data, error } = await adminClient
      .from("assigned_works")
      .select("id, staff_id, shop_id, message, progress, created_at")
      .in("staff_id", staffIds)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })

    if (error) {
      throw new Error(`Unable to load your assigned work: ${error.message}`)
    }
    assignmentRows = (data ?? []) as AssignedWorkRow[]
  }

  const shopIds = [...new Set(assignmentRows.map((work) => work.shop_id))]
  const [
    { data: shopData, error: shopsError },
    { data: profilesData, error: profilesError },
  ] = await Promise.all([
    shopIds.length > 0
      ? adminClient.from("shops").select("id, name, area").in("id", shopIds)
      : Promise.resolve({ data: [], error: null }),
    staffRows.length > 0
      ? adminClient
          .from("users")
          .select("id, full_name")
          .in("id", [...new Set(staffRows.map((staff) => staff.user_id))])
      : Promise.resolve({ data: [], error: null }),
  ])

  if (shopsError) {
    throw new Error(`Unable to load assigned-work shops: ${shopsError.message}`)
  }
  if (profilesError) {
    throw new Error(
      `Unable to load assigned staff names: ${profilesError.message}`
    )
  }

  const shopById = new Map(
    ((shopData ?? []) as ShopRow[]).map((shop) => [shop.id, shop])
  )
  const profileNames = new Map(
    ((profilesData ?? []) as ProfileRow[]).map((profile) => [
      profile.id,
      profile.full_name?.trim() || "Staff member",
    ])
  )
  const staffNames = new Map(
    staffRows.map((staff) => [
      staff.id,
      profileNames.get(staff.user_id) ?? "Staff member",
    ])
  )
  const works: AssignedWork[] = assignmentRows.map((work) => {
    const shop = shopById.get(work.shop_id)
    return {
      id: work.id,
      staffId: work.staff_id,
      staffName: staffNames.get(work.staff_id) ?? "Staff member",
      shopId: work.shop_id,
      shopName: shop?.name ?? "Shop unavailable",
      shopArea: shop?.area ?? "",
      message: work.message,
      progress: work.progress,
      createdAt: work.created_at,
    }
  })

  return (
    <AppSidebar
      user={user}
      footer={
        <Suspense fallback={null}>
          <AssignedWorkPagination works={works} />
        </Suspense>
      }
    >
      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-[1500px] animate-pulse space-y-4">
            <div className="h-8 w-40 rounded bg-slate-200" />
            <div className="h-24 rounded-xl bg-slate-100" />
            <div className="h-72 rounded-xl bg-slate-100" />
          </div>
        }
      >
        <AssignedWorkTable works={works} />
      </Suspense>
    </AppSidebar>
  )
}
