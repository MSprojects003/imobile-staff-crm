import type { LucideIcon } from "lucide-react"
import {
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  Store,
  Target,
  TrendingUp,
} from "lucide-react"

import { cn } from "@/lib/utils"

type Trend = {
  value: string
  label: string
  direction: "up" | "down"
}

export type DashboardStat = {
  title: string
  value: string
  description: string
  icon: LucideIcon
  trend: Trend
  accent: "blue" | "purple" | "orange" | "green"
  progress?: {
    value: number
    label: string
  }
}

const accentStyles = {
  blue: {
    icon: "bg-[#e8f1ff] text-[#3974d8]",
    progress: "bg-[#3974d8]",
  },
  purple: {
    icon: "bg-[#f0eaff] text-[#7757d9]",
    progress: "bg-[#7757d9]",
  },
  orange: {
    icon: "bg-[#fff2df] text-[#e49425]",
    progress: "bg-[#e49425]",
  },
  green: {
    icon: "bg-[#e5f8ef] text-[#1d9c63]",
    progress: "bg-[#1d9c63]",
  },
} as const

export const dashboardStats: DashboardStat[] = [
  {
    title: "Total Products",
    value: "1,248",
    description: "Lifetime products added",
    icon: Boxes,
    trend: { value: "12.5%", label: "vs. last month", direction: "up" },
    accent: "blue",
  },
  {
    title: "Monthly Target",
    value: "₹2,50,000",
    description: "₹1,86,400 completed",
    icon: Target,
    trend: { value: "74.6%", label: "target achieved", direction: "up" },
    accent: "purple",
    progress: { value: 74.6, label: "74.6% completed" },
  },
  {
    title: "Active Shops",
    value: "486",
    description: "Shops currently active",
    icon: Store,
    trend: { value: "8.2%", label: "vs. last month", direction: "up" },
    accent: "orange",
  },
  {
    title: "This Month's Sales",
    value: "₹84,620",
    description: "Sales recorded this month",
    icon: TrendingUp,
    trend: { value: "18.4%", label: "vs. last month", direction: "down" },
    accent: "green",
  },
]

export function StatCards({
  stats = dashboardStats,
}: {
  stats?: DashboardStat[]
}) {
  return (
    <section aria-label="Dashboard statistics" className="mt-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          const TrendIcon =
            stat.trend.direction === "up" ? ArrowUpRight : ArrowDownRight
          const styles = accentStyles[stat.accent]

          return (
            <article
              key={stat.title}
              className="flex min-h-[164px] flex-col justify-between rounded-xl border border-[#e8edf1] bg-white p-4 shadow-[0_2px_12px_rgba(25,45,74,0.04)] transition-shadow hover:shadow-[0_8px_24px_rgba(25,45,74,0.08)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-[#7a8490]">
                    {stat.title}
                  </p>
                  <p className="mt-1.5 text-[22px] leading-none font-bold tracking-tight text-[#192d4a]">
                    {stat.value}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    styles.icon
                  )}
                >
                  <Icon className="size-[18px]" strokeWidth={2.2} />
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate text-[#7a8490]">
                    {stat.description}
                  </span>
                  <span
                    className={cn(
                      "flex shrink-0 items-center gap-0.5 font-semibold",
                      stat.trend.direction === "up"
                        ? "text-[#1d9c63]"
                        : "text-[#e05b5f]"
                    )}
                  >
                    <TrendIcon className="size-3" strokeWidth={2.5} />
                    {stat.trend.value}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-[#a0a8b1]">
                  {stat.trend.label}
                </p>

                {stat.progress ? (
                  <div className="mt-2.5">
                    <div className="h-1 overflow-hidden rounded-full bg-[#edf0f2]">
                      <div
                        className={cn("h-full rounded-full", styles.progress)}
                        style={{
                          width: `${Math.min(Math.max(stat.progress.value, 0), 100)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] font-medium text-[#7a8490]">
                      {stat.progress.label}
                    </p>
                  </div>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
