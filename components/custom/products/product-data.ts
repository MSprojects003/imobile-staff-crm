import phonesBanner from "@/public/assets/phones-banner.png"

import type { ProductCategory } from "./category/category-card"

export const productCategories: ProductCategory[] = [
  {
    id: "mobile-phones",
    name: "Mobile Phones",
    description:
      "Explore the latest smartphones from trusted brands, with powerful performance, modern cameras, and reliable battery life for every customer.",
    image: phonesBanner,
  },
  {
    id: "tablets",
    name: "Tablets",
    description:
      "Browse versatile tablets for work, entertainment, learning, and everyday productivity in a range of sizes and specifications.",
    image: phonesBanner,
  },
  {
    id: "accessories",
    name: "Accessories",
    description:
      "Find essential chargers, cables, cases, screen protectors, and other accessories that complete every mobile device purchase.",
    image: phonesBanner,
  },
  {
    id: "wearables",
    name: "Wearables",
    description:
      "Discover smartwatches and wearable technology designed to help customers stay connected, active, and informed throughout the day.",
    image: phonesBanner,
  },
  {
    id: "audio",
    name: "Audio",
    description:
      "Shop headphones, earbuds, and speakers with immersive sound for calls, music, gaming, and entertainment on the move.",
    image: phonesBanner,
  },
  {
    id: "smart-home",
    name: "Smart Home",
    description:
      "Build a smarter home with connected devices that improve convenience, security, entertainment, and everyday control.",
    image: phonesBanner,
  },
]

export type Product = {
  id: string
  name: string
  brand: string
  price: string
  categoryId: string
  createdAt?: string
  frontImage: typeof phonesBanner | string
  backImage?: typeof phonesBanner | string
  originalPrice?: string
  discountPercent?: number
  description?: string
  specifications?: string[]
}

const productNames: Record<string, string[]> = {
  "mobile-phones": [
    "iPhone 15 Pro",
    "Galaxy S24 Ultra",
    "Pixel 9 Pro",
    "OnePlus 12",
  ],
  tablets: ["iPad Air", "Galaxy Tab S9", "Lenovo Tab P12", "Surface Go"],
  accessories: [
    "MagSafe Charger",
    "20W USB-C Adapter",
    "Premium Phone Case",
    "Fast Charging Cable",
  ],
  wearables: ["Apple Watch Series 9", "Galaxy Watch 6", "Fitbit Versa 4"],
  audio: ["AirPods Pro", "Galaxy Buds 3", "Sony WH-1000XM5"],
  "smart-home": ["Nest Hub", "Smart LED Bulb", "Wi-Fi Security Camera"],
}

const brands = ["Apple", "Samsung", "Google", "OnePlus"]

export const products: Product[] = Object.entries(productNames).flatMap(
  ([categoryId, names], categoryIndex) =>
  names.map((name, productIndex) => {
    const price = 79_900 + categoryIndex * 24_000 + productIndex * 15_000
    const discountPercent =
      productIndex % 3 === 0 ? 10 + (categoryIndex % 2) * 5 : undefined

    return {
      id: `${categoryId}-${productIndex + 1}`,
      name,
      brand: brands[(categoryIndex + productIndex) % brands.length],
      price: `Rs. ${Math.round(
        price * (1 - (discountPercent ?? 0) / 100)
      ).toLocaleString("en-IN")}`,
      originalPrice: discountPercent
        ? `Rs. ${price.toLocaleString("en-IN")}`
        : undefined,
      discountPercent,
      categoryId,
      frontImage: phonesBanner,
      backImage: phonesBanner,
    }
  })
)

export function getCategory(categoryId: string | undefined) {
  return productCategories.find((category) => category.id === categoryId)
}

export const productBrands = [...new Set(products.map((product) => product.brand))]
