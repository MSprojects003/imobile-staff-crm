import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"

import { getCurrentUser } from "@/lib/auth"
import { sendNotifySms } from "@/lib/notify-lk"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

const SHOP_IMAGES_BUCKET = "shops"

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

async function removeUploadedImages(
  adminClient: SupabaseClient,
  paths: string[]
) {
  if (paths.length === 0) return null

  const { error } = await adminClient.storage
    .from(SHOP_IMAGES_BUCKET)
    .remove(paths)

  return error
    ? `Unable to clean up uploaded shop images: ${error.message}`
    : null
}

export async function POST(request: Request) {
  const uploadedPaths: string[] = []

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        {
          error:
            "You must be signed in with an active staff profile to create a shop.",
        },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const name = getFormString(formData, "name")
    const owner = getFormString(formData, "owner")
    const address1 = getFormString(formData, "address1")
    const area = getFormString(formData, "area")
    const phoneNumber = getFormString(formData, "phone_number")
    const email = getFormString(formData, "email")
    const images = formData
      .getAll("images")
      .filter((value): value is File => value instanceof File && value.size > 0)

    if (!name || !owner || !address1 || !area || !phoneNumber) {
      return NextResponse.json(
        {
          error:
            "Shop name, owner, phone number, address, and area are required.",
        },
        { status: 400 }
      )
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      )
    }
    if (images.some((file) => !file.type.startsWith("image/"))) {
      return NextResponse.json(
        { error: "Only image files can be uploaded for a shop." },
        { status: 400 }
      )
    }

    const adminClient = createSupabaseAdminClient()
    const { data: staffRows, error: staffLookupError } = await adminClient
      .from("staff")
      .select("id")
      .eq("user_id", user.id)
      .limit(2)

    if (staffLookupError) {
      throw new Error(
        `Unable to find the staff record for the signed-in user: ${staffLookupError.message}`
      )
    }
    if (!staffRows?.length) {
      return NextResponse.json(
        {
          error: `No staff row has user_id ${user.id}. Make sure staff.user_id is set to this public.users.id.`,
        },
        { status: 422 }
      )
    }
    if (staffRows.length > 1) {
      return NextResponse.json(
        { error: "Multiple staff records are linked to this user." },
        { status: 409 }
      )
    }

    const { data: admins, error: adminsError } = await adminClient
      .from("users")
      .select("id, full_name, username, phone")
      .eq("is_admin", true)
      .eq("status", true)
      .order("full_name", { ascending: true })

    if (adminsError) {
      throw new Error(`Unable to load admin SMS recipients: ${adminsError.message}`)
    }

    const createdByStaffId = staffRows[0].id
    const uploadResults = await Promise.all(
      images.map(async (file) => {
        const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
        const path = `${createdByStaffId}/${crypto.randomUUID()}-${safeFilename}`
        try {
          const { error: uploadError } = await adminClient.storage
            .from(SHOP_IMAGES_BUCKET)
            .upload(path, await file.arrayBuffer(), {
              contentType: file.type,
              upsert: false,
            })

          return { file, path, uploadError }
        } catch (uploadError) {
          return {
            file,
            path,
            uploadError:
              uploadError instanceof Error
                ? uploadError
                : new Error(String(uploadError)),
          }
        }
      })
    )
    uploadedPaths.push(
      ...uploadResults
        .filter((result) => !result.uploadError)
        .map((result) => result.path)
    )
    const failedUpload = uploadResults.find((result) => result.uploadError)
    if (failedUpload?.uploadError) {
      const cleanupError = await removeUploadedImages(
        adminClient,
        uploadedPaths
      )
      const message = `Unable to upload shop image "${failedUpload.file.name}": ${failedUpload.uploadError.message}`
      throw new Error(cleanupError ? `${message} ${cleanupError}` : message)
    }

    const imageUrls = uploadedPaths.map(
      (path) =>
        adminClient.storage
          .from(SHOP_IMAGES_BUCKET)
          .getPublicUrl(path).data.publicUrl
    )
    const adminSmsMessage = `New shop creation: ${user.full_name} (@${user.username}) successfully created the shop "${name}", owned by ${owner}, located at ${address1}, ${area}.`
    const shopSmsMessage = `You have successfully joined iMobile collaboration deals with ${name}. Added by staff ${user.full_name}. For more details, contact admin: ${admins?.find((admin) => admin.phone)?.phone ?? "the iMobile admin team"}.`
    const { data: createdShop, error: createError } = await adminClient.rpc(
      "create_shop_with_broadcast",
      {
        p_name: name,
        p_owner: owner,
        p_address1: address1,
        p_area: area,
        p_phone_number: phoneNumber,
        p_email: email || null,
        p_images: imageUrls,
        p_created_by_staff_id: createdByStaffId,
        p_created_by_user_id: user.id,
        p_admin_sms_body: adminSmsMessage,
        p_shop_sms_body: shopSmsMessage,
      }
    )

    if (createError) {
      const cleanupError = await removeUploadedImages(
        adminClient,
        uploadedPaths
      )
      const message =
        createError.code === "PGRST202" ||
        /function .*create_shop_with_broadcast.* does not exist/i.test(
          createError.message
        )
          ? "Shop database setup is incomplete. Run the latest supabase/shops.sql in the Supabase SQL Editor."
          : `Unable to create shop: ${createError.message}`
      throw new Error(cleanupError ? `${message} ${cleanupError}` : message)
    }

    const smsRecipients = [
      ...(admins ?? []).map((admin) => ({
        label: `admin ${admin.id}`,
        kind: "admin" as const,
        phone: admin.phone,
        message: adminSmsMessage,
      })),
      {
        label: `shop ${name}`,
        kind: "shop" as const,
        phone: phoneNumber,
        message: shopSmsMessage,
      },
    ]
    const smsResults = await Promise.allSettled(
      smsRecipients.map(async (recipient) => {
        if (!recipient.phone) {
          throw new Error(`${recipient.label} does not have a phone number.`)
        }
        await sendNotifySms(recipient.phone, recipient.message)
      })
    )
    const failedSmsCount = smsResults.filter(
      (result) => result.status === "rejected"
    ).length
    const failedAdminSmsCount = smsResults.filter(
      (result, index) =>
        result.status === "rejected" && smsRecipients[index]?.kind === "admin"
    ).length
    const shopSmsFailed = smsResults.some(
      (result, index) =>
        result.status === "rejected" && smsRecipients[index]?.kind === "shop"
    )
    if (failedSmsCount > 0) {
      smsResults.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(
            `Notify.lk shop-creation SMS failed for ${smsRecipients[index]?.label ?? "unknown recipient"}:`,
            result.reason
          )
        }
      })
    }

    return NextResponse.json(
      {
        ...createdShop,
        smsDelivery: {
          sent: smsResults.length - failedSmsCount,
          failed: failedSmsCount,
          adminFailed: failedAdminSmsCount,
          shopFailed: shopSmsFailed,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Unable to create shop.", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create shop.",
      },
      { status: 500 }
    )
  }
}
