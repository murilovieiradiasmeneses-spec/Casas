import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Signs photo links only for listings that are published by an active agency. */
export const signPublicPhotos = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ paths: z.array(z.string().min(1).max(500)).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const allowed: string[] = [];
    await Promise.all(
      data.paths.map(async (p) => {
        const { data: ok } = await supabaseAdmin.rpc("can_read_public_property_photo", { _path: p });
        if (ok) allowed.push(p);
      }),
    );
    if (!allowed.length) return [] as { path: string; url: string }[];
    const { data: signed } = await supabaseAdmin.storage
      .from("property-images")
      .createSignedUrls(allowed, 60 * 60 * 6);
    return (signed ?? [])
      .filter((s) => s.path && s.signedUrl)
      .map((s) => ({ path: s.path as string, url: s.signedUrl }));
  });
