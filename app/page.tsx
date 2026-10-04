import { redirect } from "next/navigation"

import { AppSidebar } from "@/components/custom/dashboard/app-sidebar"
import { getCurrentUser } from "@/lib/auth"

export const dynamic = "force-dynamic"

export default async function Page() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <AppSidebar user={user}>
      <div className="mx-auto w-full max-w-[1500px]">
        <h1 className="text-2xl font-bold tracking-tight text-[#192d4a] sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-[#7a8490]">
          Overview of your daily performance
        </p>
      </div>
    </AppSidebar>
  )
}
