"use client"

import * as React from "react"
import {
  Area,
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Range = "year" | "six-months" | "month" | "week"

type SalesOrder = { createdAt: string; total: number }
type ChartPoint = { label: string; sales: number }

const rangeLabels: Record<Range, string> = {
  year: "This year",
  "six-months": "Last 6 months",
  month: "This month",
  week: "This week",
}

const chartConfig = {
  sales: {
    label: "Sales",
    color: "#3974d8",
  },
} satisfies ChartConfig

function formatSales(value: number) {
  return `Rs. ${value.toLocaleString("en-IN")}`
}

function buildChartData(orders: SalesOrder[], range: Range): ChartPoint[] {
  const now = new Date()
  const addSales = (start: Date, end: Date) =>
    orders.reduce((total, order) => {
      const createdAt = new Date(order.createdAt)
      return createdAt >= start && createdAt < end ? total + order.total : total
    }, 0)

  if (range === "year") {
    return Array.from({ length: 12 }, (_, month) => ({
      label: new Intl.DateTimeFormat("en", { month: "short" }).format(
        new Date(now.getFullYear(), month, 1)
      ),
      sales: addSales(
        new Date(now.getFullYear(), month, 1),
        new Date(now.getFullYear(), month + 1, 1)
      ),
    }))
  }

  if (range === "six-months") {
    return Array.from({ length: 6 }, (_, index) => {
      const month = now.getMonth() - 5 + index
      const start = new Date(now.getFullYear(), month, 1)
      return {
        label: new Intl.DateTimeFormat("en", { month: "short" }).format(start),
        sales: addSales(start, new Date(start.getFullYear(), start.getMonth() + 1, 1)),
      }
    })
  }

  if (range === "month") {
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate()
    return Array.from({ length: 4 }, (_, index) => {
      const startDay = Math.floor((index * daysInMonth) / 4)
      const endDay = Math.floor(((index + 1) * daysInMonth) / 4)
      return {
        label: `Week ${index + 1}`,
        sales: addSales(
          new Date(now.getFullYear(), now.getMonth(), startDay + 1),
          new Date(now.getFullYear(), now.getMonth(), endDay + 1)
        ),
      }
    })
  }

  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  weekStart.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, index) => {
    const start = new Date(weekStart)
    start.setDate(weekStart.getDate() + index)
    const end = new Date(start)
    end.setDate(start.getDate() + 1)
    return {
      label: new Intl.DateTimeFormat("en", { weekday: "short" }).format(start),
      sales: addSales(start, end),
    }
  })
}

export function LineChart({ orders }: { orders: SalesOrder[] }) {
  const [range, setRange] = React.useState<Range>("six-months")
  const data = buildChartData(orders, range)
  const trendIsPositive =
    data[data.length - 1].sales >= data[0].sales
  const areaGradientId = `sales-area-gradient-${range}`

  return (
    <section className="mt-5 w-full flex-1 lg:w-auto">
      <div className="rounded-xl border border-[#e8edf1] bg-white p-4 shadow-[0_2px_12px_rgba(25,45,74,0.04)] sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#192d4a]">
              Sales Analysis
            </h2>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-[11px] text-[#8795a3]">
                Track your sales performance over time
              </p>
              <span
                className={
                  trendIsPositive
                    ? "text-[10px] font-semibold text-[#1d9c63]"
                    : "text-[10px] font-semibold text-[#e05b5f]"
                }
              >
                {trendIsPositive ? "Positive trend" : "Needs attention"}
              </span>
            </div>
          </div>
          <Select
            value={range}
            onValueChange={(value) => {
              if (value !== null) setRange(value as Range)
            }}
          >
            <SelectTrigger className="h-8 w-[138px] border-[#c7d0d9] bg-white text-xs text-[#526274] shadow-none hover:border-[#aebbc8]">
              <SelectValue>{rangeLabels[range]}</SelectValue>
            </SelectTrigger>
            <SelectContent className="border border-[#e1e7ec] bg-white p-1 text-[#526274] shadow-[0_12px_30px_rgba(29,52,74,0.12)]">
              <SelectItem value="year" className="rounded-md text-xs">
                This year
              </SelectItem>
              <SelectItem value="six-months" className="rounded-md text-xs">
                Last 6 months
              </SelectItem>
              <SelectItem value="month" className="rounded-md text-xs">
                This month
              </SelectItem>
              <SelectItem value="week" className="rounded-md text-xs">
                This week
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ChartContainer
          config={chartConfig}
          className="mt-5 h-[230px] w-full aspect-auto sm:h-[260px]"
        >
          <RechartsLineChart
            accessibilityLayer
            data={data}
            margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="#edf0f2"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tickMargin={9}
              tick={{ fill: "#8795a3", fontSize: 10 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              tick={{ fill: "#8795a3", fontSize: 10 }}
              tickFormatter={(value: number) => `Rs. ${value / 1000}k`}
              width={42}
            />
            <ChartTooltip
              cursor={{ stroke: "#c7d0d9", strokeDasharray: "4 4" }}
              content={
                <ChartTooltipContent
                  formatter={(value) => [
                    formatSales(Number(value)),
                    "Sales",
                  ]}
                />
              }
            />
            <defs>
              <linearGradient
                id={areaGradientId}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#3974d8" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#3974d8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              dataKey="sales"
              type="monotone"
              fill={`url(#${areaGradientId})`}
              fillOpacity={1}
              stroke="none"
            />
            <Line
              dataKey="sales"
              type="monotone"
              stroke="#3974d8"
              strokeWidth={2.5}
              dot={{
                fill: "#fff",
                r: 3,
                stroke: "#3974d8",
                strokeWidth: 2,
              }}
              activeDot={{
                r: 5,
                fill: "#3974d8",
                stroke: "#fff",
                strokeWidth: 2,
              }}
            />
          </RechartsLineChart>
        </ChartContainer>
      </div>
    </section>
  )
}
