import { Skeleton } from "@/components/ui/skeleton"

export default function OrderDetailsLoading() {
  return (
    <div className="flex min-h-svh bg-[#fafbfc]">
      <aside
        aria-hidden="true"
        className="hidden w-64 shrink-0 border-r border-[#e8edf1] bg-white p-4 md:block"
      >
        <Skeleton className="h-10 w-28 rounded-none" />
        <div className="mt-10 space-y-3">
          <Skeleton className="h-9 w-full rounded-none" />
          <Skeleton className="h-9 w-full rounded-none" />
          <Skeleton className="h-9 w-full rounded-none" />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header
          aria-hidden="true"
          className="flex h-[68px] items-center justify-between border-b border-[#edf0f2] bg-white px-4 sm:px-6"
        >
          <Skeleton className="h-4 w-36" />
          <Skeleton className="size-9 rounded-full" />
        </header>

        <main
          aria-label="Loading order details"
          className="mx-auto w-full max-w-6xl space-y-5 p-4 pb-12 sm:p-6 lg:px-8"
        >
          <Skeleton className="h-9 w-32" />

          <section className="overflow-hidden rounded-2xl border border-red-100 bg-white">
            <div className="flex flex-col justify-between gap-5 p-4 sm:flex-row sm:items-center sm:p-6">
              <div className="space-y-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-44" />
              </div>
              <div className="space-y-2 sm:text-right">
                <Skeleton className="h-3 w-20 sm:ml-auto" />
                <Skeleton className="h-6 w-32 sm:ml-auto" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-red-100 p-4 sm:grid-cols-4 sm:p-5">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="space-y-2 rounded-lg bg-slate-50 p-3">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-red-100 bg-white">
            <div className="flex items-center justify-between border-b border-red-100 px-4 py-4 sm:px-5">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
            <div className="divide-y divide-red-100">
              {Array.from({ length: 3 }, (_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-4 sm:gap-4 sm:p-5"
                >
                  <Skeleton className="size-[4.5rem] shrink-0 rounded-xl sm:size-20" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-5 w-20 shrink-0" />
                </div>
              ))}
            </div>
          </section>

          <section className="ml-auto w-full max-w-md space-y-3 rounded-2xl border border-red-100 bg-white p-4 sm:p-5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-8 w-full" />
          </section>
        </main>
      </div>
    </div>
  )
}
