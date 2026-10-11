import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { normalizeStaffPhone } from "@/lib/auth-credentials"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const PROFILE_IMAGES_BUCKET = "profile_images"
const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

export async function PATCH(request: Request) {
  let uploadedPath: string | null = null
  let adminClient: ReturnType<typeof createSupabaseAdminClient> | null = null

  try {
    const profile = await getCurrentUser()
    if (!profile) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 }
      )
    }

    const serverClient = await createSupabaseServerClient()
    const { data: authResult, error: authError } =
      await serverClient.auth.getUser()
    if (authError || !authResult.user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const fullName = String(formData.get("full_name") ?? "").trim()
    const rawPhone = String(formData.get("phone") ?? "").trim()
    const phone = normalizeStaffPhone(rawPhone)
    const imageValue = formData.get("image")
    const image =
      imageValue instanceof File && imageValue.size > 0 ? imageValue : null

    if (!fullName || fullName.length > 120) {
      return NextResponse.json(
        { error: "Enter a name between 1 and 120 characters." },
        { status: 400 }
      )
    }
    if (
      phone.replace(/\D/g, "").length < 9 ||
      phone.replace(/\D/g, "").length > 15
    ) {
      return NextResponse.json(
        { error: "Enter a valid phone number." },
        { status: 400 }
      )
    }
    if (image && !IMAGE_EXTENSIONS[image.type]) {
      return NextResponse.json(
        { error: "Choose a PNG, JPG, or WebP profile photo." },
        { status: 400 }
      )
    }
    if (image && image.size > MAX_PROFILE_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "The profile photo must be 5 MB or smaller." },
        { status: 400 }
      )
    }

    adminClient = createSupabaseAdminClient()
    const { data: duplicatePhone, error: duplicatePhoneError } =
      await adminClient
        .from("users")
        .select("id")
        .eq("phone", phone)
        .neq("id", profile.id)
        .limit(1)
        .maybeSingle()

    if (duplicatePhoneError) {
      throw new Error(
        `Unable to verify the phone number: ${duplicatePhoneError.message}`
      )
    }
    if (duplicatePhone) {
      return NextResponse.json(
        { error: "That phone number is already assigned to another account." },
        { status: 409 }
      )
    }

    const { error: metadataError } =
      await adminClient.auth.admin.updateUserById(authResult.user.id, {
        app_metadata: {
          ...authResult.user.app_metadata,
          staff_user_id: profile.id,
        },
      })
    if (metadataError) {
      throw new Error(
        `Unable to preserve the staff sign-in link: ${metadataError.message}`
      )
    }

    let profileImageUrl = profile.profile_image_url
    if (image) {
      const path = `${profile.id}/${crypto.randomUUID()}.${IMAGE_EXTENSIONS[image.type]}`
      const { error: uploadError } = await adminClient.storage
        .from(PROFILE_IMAGES_BUCKET)
        .upload(path, await image.arrayBuffer(), {
          contentType: image.type,
          upsert: false,
        })
      if (uploadError) {
        throw new Error(
          `Unable to upload profile photo: ${uploadError.message}`
        )
      }
      uploadedPath = path
      profileImageUrl = adminClient.storage
        .from(PROFILE_IMAGES_BUCKET)
        .getPublicUrl(path).data.publicUrl
    }

    const { error: updateError } = await adminClient
      .from("users")
      .update({
        full_name: fullName,
        phone,
        profile_image_url: profileImageUrl,
      })
      .eq("id", profile.id)

    if (updateError) {
      throw new Error(`Unable to save profile changes: ${updateError.message}`)
    }

    return NextResponse.json({
      profile: {
        full_name: fullName,
        phone,
        profile_image_url: profileImageUrl,
      },
    })
  } catch (error) {
    if (uploadedPath && adminClient) {
      const { error: cleanupError } = await adminClient.storage
        .from(PROFILE_IMAGES_BUCKET)
        .remove([uploadedPath])
      if (cleanupError) {
        console.error(
          "Unable to clean up failed profile photo upload.",
          cleanupError
        )
      }
    }
    console.error("Unable to update account profile.", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update your profile.",
      },
      { status: 500 }
    )
  }
}
