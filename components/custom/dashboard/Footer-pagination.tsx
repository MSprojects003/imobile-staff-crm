"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { cn } from "cn"

type FooterPaginationProps = {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  hideAtBottom?: boolean
  className?: string
  itemLabel?: string
  ariaLabel?: string
}

export function FooterPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  hideAtBottom = true,
  className,
  itemLabel = "products",
  ariaLabel = "Product pages",
}: FooterPaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isAtBottom, setIsAtBottom] = useState(false)

  useEffect(() => {
    const updateScrollState = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement
      setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 4)
    }

    updateScrollState()
    window.addEventListener("scroll", updateScrollState, { passive: true })
    window.addEventListener("resize", updateScrollState)

    return () => {
      window.removeEventListener("scroll", updateScrollState)
      window.removeEventListener("resize", updateScrollState)
    }
  }, [])

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(page))
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const lastItem = Math.min(currentPage * pageSize, totalItems)

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "fixed bottom-3 left-1/2 z-30 flex w-[calc(100%-5rem)] -translate-x-1/2 items-center gap-3 overflow-y-hidden rounded-2xl border border-[#e8edf1] bg-white/95 px-3 py-2.5 shadow-[0_8px_30px_rgba(25,45,74,0.14)] backdrop-blur md:sticky md:right-auto md:bottom-0 md:left-auto md:z-0 md:-mx-0 md:mt-0 md:w-full md:translate-x-0 md:justify-center md:rounded-none md:border-r-0 md:border-b-0 md:border-l-0 md:px-8 md:py-4 md:shadow-[0_-4px_20px_rgba(25,45,74,0.06)]",
        hideAtBottom && isAtBottom && "max-md:hidden",
        className
      )}
    >
      <div className="flex w-full max-w-[1500px] items-center justify-between gap-2 sm:gap-4">
        <span className="shrink-0 text-xs text-[#8795a3] md:text-sm">
          <span className="md:hidden">
            <strong className="font-semibold text-[#526274]">
              {firstItem}-{lastItem}
            </strong>{" "}
            of {totalItems}
          </span>
          <span className="hidden md:inline">
            Showing{" "}
            <strong className="font-semibold text-[#526274]">
              {firstItem}
            </strong>
            {" - "}
            <strong className="font-semibold text-[#526274]">{lastItem}</strong>
            {" of "}
            <strong className="font-semibold text-[#526274]">
              {totalItems}
            </strong>{" "}
            {itemLabel}
          </span>
        </span>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Previous page"
            disabled={currentPage === 1}
            onClick={() => goToPage(currentPage - 1)}
            className="h-8 px-2 text-xs text-[#526274] hover:bg-[#fff1f1] hover:text-[#e7242b] sm:h-9 sm:px-3 sm:text-sm"
          >
            <ChevronLeft />
            <span className="hidden md:inline">Previous</span>
          </Button>
          <span className="min-w-16 text-center text-xs font-medium text-[#526274] sm:min-w-20 sm:text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Next page"
            disabled={currentPage === totalPages}
            onClick={() => goToPage(currentPage + 1)}
            className="h-8 px-2 text-xs text-[#526274] hover:bg-[#fff1f1] hover:text-[#e7242b] sm:h-9 sm:px-3 sm:text-sm"
          >
            <span className="hidden md:inline">Next</span>
            <ChevronRight />
          </Button>
        </div>
      </div>
    </nav>
  )
}
