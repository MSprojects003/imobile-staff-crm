"use client"

import { ProfilePopover } from "@/components/custom/dashboard/profile-popover"

type FooterProfileProps = {
  userId: string
  fullName: string
  username: string
  phone: string
  profileImageUrl: string | null
  role?: string
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export function FooterProfile({
  userId,
  fullName,
  username,
  phone,
  profileImageUrl,
  role = "Staff",
}: FooterProfileProps) {
  return (
    <ProfilePopover
      userId={userId}
      fullName={fullName}
      username={username}
      phone={phone}
      profileImageUrl={profileImageUrl}
      role={role}
      initials={getInitials(fullName)}
    />
  )
}
