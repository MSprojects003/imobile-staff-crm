import Image, { type ImageProps } from "next/image"
import type { ReactNode } from "react"
import logo from "@/public/imobile.webp"
import phone from "@/public/assets/phones-banner.png"

type LeftBannerProps = {
  children: ReactNode
  bannerImage?: ImageProps["src"]
  bannerTitle?: ReactNode
  bannerDescription?: string
}

export function LeftBanner({
  children,
  bannerImage = phone,
  bannerTitle = (
    <>
      Your Trusted
      <br />
      Mobile Partner
    </>
  ),
  bannerDescription = "Better Devices, Brighter Future.",
}: LeftBannerProps) {
  return (
    <section className="relative flex min-h-screen w-full overflow-hidden bg-gradient-to-r from-[#fff3f3] via-[#fffafa] to-white px-5 py-6 sm:px-8 sm:py-8 lg:px-22 lg:py-6">
      <div className="absolute -top-32 -left-24 size-[26rem] rounded-full bg-[#ffe8e8]/80" />
      <div className="absolute -bottom-48 left-[18%] size-[30rem] rounded-full bg-[#fff0f0]/80" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-col gap-8 lg:grid lg:grid-cols-[minmax(280px,0.85fr)_minmax(430px,1fr)] lg:items-center lg:gap-0 xl:grid-cols-[minmax(340px,0.9fr)_minmax(480px,1fr)] xl:gap-2">
        <div className="flex flex-col">
          <Image
            src={logo}
            alt="iMobile Supreme"
            width={150}
            height={48}
            priority
            className="h-auto w-[150px] sm:w-[170px] lg:w-[120px] xl:w-[180px]"
          />

          <div className="relative flex flex-1 items-center justify-center py-2 sm:py-4 lg:py-8">
            <Image
              src={bannerImage}
              alt=""
              width={500}
              height={500}
              priority
              className="h-auto w-full max-w-[245px] object-contain sm:max-w-[280px] lg:max-w-[330px]"
            />
          </div>

          <div className="relative z-10">
            <h2 className="text-xl leading-tight font-extrabold text-[#192d4a] xl:text-3xl">
              {bannerTitle}
            </h2>
            <p className="mt-2 text-xs font-medium text-[#6f7884] xl:text-sm">
              {bannerDescription}
            </p>
          </div>
        </div>

        {children}
      </div>
    </section>
  )
}
