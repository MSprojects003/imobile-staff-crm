import Image, { type StaticImageData } from "next/image"

import { Card, CardContent } from "@/components/ui/card"

export type TopProduct = {
  id: string
  name: string
  sold: number
  image: StaticImageData | string
}

export function TopProductCard({ product }: { product: TopProduct }) {
  return (
    <Card
      size="sm"
      className="rounded-none border-0 border-b border-[#edf0f2] bg-transparent py-0 shadow-none ring-0 last:border-b-0"
    >
      <CardContent className="flex min-w-0 items-center gap-3 px-0 py-3">
        <div className="relative size-11 shrink-0 overflow-hidden rounded-md bg-[#f5f7f9]">
          <Image
            src={product.image}
            alt=""
            fill
            sizes="44px"
            className="object-cover object-center"
          />
        </div>
        <p
          title={product.name}
          className="min-w-0 flex-1 truncate text-sm font-medium text-[#526274]"
        >
          {product.name}
        </p>
        <p className="shrink-0 text-xs font-medium text-[#8795a3]">
          {product.sold} sold
        </p>
      </CardContent>
    </Card>
  )
}
