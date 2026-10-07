"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, type DayPickerProps } from "react-day-picker"
import { cn } from "cn"

function Calendar({ className, classNames, ...props }: DayPickerProps) {
  return (
    <DayPicker
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col",
        month: "space-y-4",
        month_caption: "relative flex h-8 items-center justify-center",
        caption_label: "text-sm font-semibold text-slate-900",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous:
          "flex size-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500",
        button_next:
          "flex size-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-9 rounded-md text-center text-[0.8rem] font-medium text-slate-500",
        weeks: "mt-2 flex flex-col gap-1",
        week: "flex w-full",
        day: "relative p-0 text-center text-sm",
        day_button:
          "flex size-9 items-center justify-center rounded-md text-sm text-slate-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500",
        selected:
          "rounded-md bg-red-600 text-white hover:bg-red-600 hover:text-white",
        range_start: "rounded-l-md bg-red-50",
        range_middle: "rounded-none bg-red-50",
        range_end: "rounded-r-md bg-red-50",
        today: "font-bold text-red-700",
        outside: "text-slate-300",
        disabled: "cursor-not-allowed text-slate-300 opacity-50",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("size-4", chevronClassName)} />
          ) : (
            <ChevronRight className={cn("size-4", chevronClassName)} />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
