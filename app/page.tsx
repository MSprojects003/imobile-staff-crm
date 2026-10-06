import { redirect } from "next/navigation"

import { AppSidebar } from "@/components/custom/dashboard/app-sidebar"
import { LineChart } from "@/components/custom/dashboard/LineChart"
import { StatCards } from "@/components/custom/dashboard/StatCards"
import { TopProduct } from "@/components/custom/dashboard/top-product"
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
        <h1 className="text-lg font-bold tracking-tight text-[#192d4a] sm:text-xl md:hidden">
          Dashboard
        </h1>
        <p className="mt-0.5 text-[11px] text-[#7a8490] sm:text-xs md:hidden">
          Overview of your daily performance
        </p>
        <StatCards />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <LineChart />
          <TopProduct />
        </div>
      </div>
    </AppSidebar>
  )
}
