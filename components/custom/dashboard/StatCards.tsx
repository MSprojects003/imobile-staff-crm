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
  trend?: Trend
  accent: "blue" | "purple" | "orange" | "green"
  progress?: {
    value: number
    label: string
  }
  mood?: string
  weeklyAnalysis?: string
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
    title: "Total Shops",
    value: "486",
    description: "All shops",
    icon: Store,
    trend: { value: "8.2%", label: "vs. last month", direction: "up" },
    accent: "orange",
  },
  {
    title: "Delivered Sales",
    value: "₹84,620",
    description: "From delivered orders",
    icon: TrendingUp,
    trend: { value: "18.4%", label: "vs. last month", direction: "down" },
    accent: "green",
  },
]

export function StatCards({
  stats = dashboardStats,
  monthlyTarget = { targetAmount: 0, achievedAmount: 0, currentWeek: 1 },
  liveStats = { totalProducts: 0, totalShops: 0, deliveredSales: 0 },
}: {
  stats?: DashboardStat[]
  monthlyTarget?: {
    targetAmount: number
    achievedAmount: number
    currentWeek: number
  }
  liveStats?: {
    totalProducts: number
    totalShops: number
    deliveredSales: number
  }
}) {
  const targetPercentage =
    monthlyTarget.targetAmount > 0
      ? (monthlyTarget.achievedAmount / monthlyTarget.targetAmount) * 100
      : 0
  const expectedAmount =
    (monthlyTarget.targetAmount * monthlyTarget.currentWeek) / 4
  const isOnPace = monthlyTarget.achievedAmount >= expectedAmount
  const nextMilestonePercentage =
    targetPercentage < 30
      ? 30
      : targetPercentage < 60
        ? 60
        : targetPercentage < 90
          ? 90
          : targetPercentage < 100
            ? 100
            : null
  const amountToNextMilestone =
    nextMilestonePercentage === null
      ? 0
      : Math.max(
          0,
          (monthlyTarget.targetAmount * nextMilestonePercentage) / 100 -
            monthlyTarget.achievedAmount
        )
  const targetMood =
    targetPercentage >= 90
      ? "😄"
      : targetPercentage >= 60
        ? "😅"
        : targetPercentage >= 30
          ? "🙂"
          : "😐"
  const formattedAmount = (amount: number) =>
    `Rs. ${amount.toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  const formattedCount = (count: number) =>
    count.toLocaleString("en-LK", { maximumFractionDigits: 0 })
  const currentStats = stats.map((stat) => {
    switch (stat.title) {
      case "Total Products":
        return {
          ...stat,
          value: formattedCount(liveStats.totalProducts),
          description: "Active products",
          trend: undefined,
        }
      case "Total Shops":
        return {
          ...stat,
          value: formattedCount(liveStats.totalShops),
          description: "All shops",
          trend: undefined,
        }
      case "Delivered Sales":
        return {
          ...stat,
          value: formattedAmount(liveStats.deliveredSales),
          description: "From your delivered orders",
          trend: undefined,
        }
      case "Monthly Target":
        return {
          ...stat,
          value: formattedAmount(monthlyTarget.targetAmount),
          description: `${formattedAmount(monthlyTarget.achievedAmount)} achieved`,
          trend: {
            value: `${targetPercentage.toFixed(1)}%`,
            label: "target achieved",
            direction: isOnPace ? ("up" as const) : ("down" as const),
          },
          progress: {
            value: targetPercentage,
            label: `${targetPercentage.toFixed(1)}% completed`,
          },
          mood: targetMood,
          weeklyAnalysis:
            monthlyTarget.targetAmount <= 0
              ? "No monthly target set"
              : nextMilestonePercentage === null
                ? "Monthly target reached"
                : `${formattedAmount(amountToNextMilestone)} to reach ${nextMilestonePercentage}% · Week ${monthlyTarget.currentWeek}: ${
                    isOnPace ? "on pace" : "behind pace"
                  }`,
        }
      default:
        return stat
    }
  })

  return (
    <section aria-label="Dashboard statistics" className="mt-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {currentStats.map((stat) => {
          const Icon = stat.icon
          const isMonthlyTarget = stat.title === "Monthly Target"
          const TrendIcon = stat.trend
            ? stat.trend.direction === "up"
              ? ArrowUpRight
              : ArrowDownRight
            : null
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
                    isMonthlyTarget ? "bg-purple-50" : styles.icon
                  )}
                >
                  {isMonthlyTarget ? (
                    <span
                      role="img"
                      aria-label={`Target progress: ${stat.mood}`}
                      className="text-2xl leading-none"
                    >
                      {stat.mood}
                    </span>
                  ) : (
                    <Icon className="size-[18px]" strokeWidth={2.2} />
                  )}
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate text-[#7a8490]">
                    {stat.description}
                  </span>
                  {!isMonthlyTarget && stat.trend && TrendIcon ? (
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
                  ) : null}
                </div>
                {!isMonthlyTarget && stat.trend ? (
                  <p className="mt-0.5 text-[10px] text-[#a0a8b1]">
                    {stat.trend.label}
                  </p>
                ) : null}

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
                    {!isMonthlyTarget ? (
                      <p className="mt-1 text-[10px] font-medium text-[#7a8490]">
                        {stat.progress.label}
                      </p>
                    ) : null}
                    {isMonthlyTarget ? (
                      <p className="mt-1 text-[10px] font-medium text-[#7a8490]">
                        {stat.weeklyAnalysis}
                      </p>
                    ) : null}
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
