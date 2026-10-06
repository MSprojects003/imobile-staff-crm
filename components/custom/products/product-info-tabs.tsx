"use client"

import * as React from "react"
import { CheckCircle2, ChevronDown } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type ProductInfoTabsProps = {
  description?: string
  specifications?: string[]
}

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "specifications", label: "Specifications" },
] as const

type TabValue = (typeof TABS)[number]["value"]

const TRIGGER_CLASS =
  "flex-none rounded-none px-0 pb-3 text-sm font-semibold text-[#8795a3] after:bottom-[-1px] after:bg-[#e7242b] data-active:text-[#e7242b]"

const BODY_TEXT_CLASS = "text-sm leading-6 text-[#657487]"

function OverviewContent({ description }: { description?: string }) {
  return (
    <p className={BODY_TEXT_CLASS}>
      {description || "Product details are available on the product page."}
    </p>
  )
}

function SpecificationsContent({
  specifications,
}: {
  specifications: string[]
}) {
  if (specifications.length === 0) {
    return (
      <p className={BODY_TEXT_CLASS}>
        Specifications are available on the product page.
      </p>
    )
  }

  return (
    <ul className="grid gap-px border border-[#edf0f2] bg-[#edf0f2] sm:grid-cols-2">
      {specifications.map((specification, index) => (
        <li
          key={`${specification}-${index}`}
          className={`flex items-start gap-2 bg-white px-4 py-3 ${BODY_TEXT_CLASS}`}
        >
          <CheckCircle2
            aria-hidden="true"
            className="mt-1 size-4 shrink-0 text-[#e7242b]"
          />
          <span className="min-w-0 break-words">{specification}</span>
        </li>
      ))}
    </ul>
  )
}

/* Mobile accordion ---------------------------------------------------------- */

function AccordionItem({
  id,
  label,
  open,
  onToggle,
  children,
}: {
  id: string
  label: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-[#edf0f2]">
      <h3>
        <button
          type="button"
          id={`${id}-trigger`}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={onToggle}
          className="flex w-full items-center justify-between rounded-none py-4 text-left text-sm font-semibold text-[#192d4a] focus-visible:outline-2 focus-visible:outline-[#e7242b]"
        >
          {label}
          <ChevronDown
            aria-hidden="true"
            className={`size-4 text-[#657487] transition-transform ${
              open ? "rotate-180 text-[#e7242b]" : ""
            }`}
          />
        </button>
      </h3>
      {open && (
        <div
          id={`${id}-panel`}
          role="region"
          aria-labelledby={`${id}-trigger`}
          className="pb-5"
        >
          {children}
        </div>
      )}
    </div>
  )
}

/* Component ----------------------------------------------------------------- */

export function ProductInfoTabs({
  description,
  specifications = [],
}: ProductInfoTabsProps) {
  const [openItem, setOpenItem] = React.useState<TabValue | null>("overview")

  const toggle = (value: TabValue) =>
    setOpenItem((current) => (current === value ? null : value))

  return (
    <>
      {/* Desktop: tabs */}
      <Tabs defaultValue={TABS[0].value} className="hidden pt-4 lg:block">
        <TabsList
          variant="line"
          className="w-full justify-start gap-6 rounded-none border-b border-[#edf0f2] p-0"
        >
          {TABS.map(({ value, label }) => (
            <TabsTrigger key={value} value={value} className={TRIGGER_CLASS}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="min-h-24 pt-4">
          <OverviewContent description={description} />
        </TabsContent>
        <TabsContent value="specifications" className="min-h-20 pt-4">
          <SpecificationsContent specifications={specifications} />
        </TabsContent>
      </Tabs>

      {/* Mobile / tablet: accordion */}
      <div className="border-t border-[#edf0f2] lg:hidden">
        <AccordionItem
          id="info-overview"
          label="Product Overview"
          open={openItem === "overview"}
          onToggle={() => toggle("overview")}
        >
          <OverviewContent description={description} />
        </AccordionItem>
        <AccordionItem
          id="info-specifications"
          label="Specifications"
          open={openItem === "specifications"}
          onToggle={() => toggle("specifications")}
        >
          <SpecificationsContent specifications={specifications} />
        </AccordionItem>
      </div>
    </>
  )
}