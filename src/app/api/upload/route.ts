import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { getCurrentUser } from "@/lib/server/auth";
import { handle, httpError } from "@/lib/server/http";

// ---------------------------------------------------------------------------
// POST /api/upload
// multipart/form-data { file: File, folder?: string }
//
// - admin only
// - pushes the file into the Supabase Storage bucket `product-images`
// - returns { url, path } where `url` is the public URL to store in the
//   products.image column
//
// Bucket expectation: a PUBLIC bucket named `product-images`. Create it in
// the Supabase dashboard (Storage → New bucket → name "product-images",
// toggle "Public bucket"). No RLS on storage.objects is needed because we
// upload with the service-role key on the server.
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";
// Route handlers default to Node runtime, which is what we need (service-
// role client is Node-only). Declaring it explicitly so this can't get
// accidentally flipped to edge later.
export const runtime = "nodejs";

const BUCKET = "product-images";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — generous for product photos
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export const POST = (req: NextRequest) =>
  handle(async () => {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") httpError(401, "Unauthorized");

    const form = await req.formData().catch(() => null);
    if (!form) httpError(400, "Expected multipart/form-data");

    const file = form.get("file");
    if (!(file instanceof File)) httpError(400, "No file provided");

    if (file.size === 0) httpError(400, "File is empty");
    if (file.size > MAX_BYTES) {
      httpError(413, `File too large (max ${MAX_BYTES / (1024 * 1024)} MB)`);
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      httpError(415, `Unsupported type: ${file.type || "unknown"}`);
    }

    // Derive a stable, safe path. We keep the original extension for correct
    // Content-Type on the CDN, and prefix with a folder so bucket browsing
    // stays tidy.
    const folderRaw = form.get("folder");
    const folder =
      typeof folderRaw === "string" && folderRaw.length > 0
        ? folderRaw.replace(/[^a-z0-9/_-]/gi, "-").slice(0, 64)
        : "products";
    const ext = file.name.includes(".")
      ? file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase()
      : file.type.split("/")[1] || "bin";
    const safeExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const objectPath = `${folder}/${id}.${safeExt}`;

    const bytes = new Uint8Array(await file.arrayBuffer());
    const sb = getSupabaseAdmin();

    const { error: upErr } = await sb.storage
      .from(BUCKET)
      .upload(objectPath, bytes, {
        contentType: file.type,
        upsert: false,
        // 1 hour browser cache — the objectPath is immutable anyway.
        cacheControl: "3600",
      });

    if (upErr) {
      // Common reason: bucket missing. Give an actionable error.
      // eslint-disable-next-line no-console
      console.error("[upload] storage.upload failed:", upErr);
      const isMissingBucket = /bucket not found/i.test(upErr.message ?? "");
      if (isMissingBucket) {
        httpError(
          500,
          `Supabase Storage bucket "${BUCKET}" does not exist. ` +
            `Create it in the Supabase dashboard (Storage → New bucket, Public).`
        );
      }
      httpError(500, upErr.message || "Upload failed");
    }

    const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(objectPath);
    if (!pub?.publicUrl) {
      httpError(
        500,
        `Uploaded but bucket "${BUCKET}" is not public. ` +
          `Toggle "Public bucket" in Supabase Storage settings.`
      );
    }

    return { url: pub.publicUrl, path: objectPath };
  });
