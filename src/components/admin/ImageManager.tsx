import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BUCKET, signPaths, type Property } from "@/lib/properties";
import { cn } from "@/lib/utils";

export function ImageManager({ property, onChange }: { property: Property; onChange: () => void }) {
  const [uploading, setUploading] = useState(false);
  const q = useQuery({
    queryKey: ["admin-images", property.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("property_images").select("*").eq("property_id", property.id).order("position");
      if (error) throw error;
      const urls = await signPaths(data.map((i) => i.url));
      return data.map((i) => ({ ...i, signed: urls.get(i.url) ?? "" }));
    },
  });
  const images = q.data ?? [];

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    let pos = images.length;
    let firstPath: string | null = null;
    let failed = 0;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) { failed++; continue; }
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${property.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
      if (error) { failed++; continue; }
      const { error: e2 } = await supabase.from("property_images").insert({ property_id: property.id, url: path, storage_path: path, position: pos++ });
      if (e2) { failed++; continue; }
      firstPath ??= path;
    }
    if (!property.cover_image_url && firstPath) await supabase.from("properties").update({ cover_image_url: firstPath }).eq("id", property.id);
    setUploading(false);
    if (failed) toast.error(`${failed} arquivo(s) não enviados (apenas imagens até 10 MB).`);
    else toast.success("Fotos enviadas.");
    q.refetch();
    onChange();
  }

  async function setCover(path: string) {
    const { error } = await supabase.from("properties").update({ cover_image_url: path }).eq("id", property.id);
    if (error) return toast.error("Não foi possível definir a capa.");
    toast.success("Capa atualizada.");
    onChange();
  }

  async function remove(id: string, path: string) {
    await supabase.storage.from(BUCKET).remove([path]);
    const { error } = await supabase.from("property_images").delete().eq("id", id);
    if (error) return toast.error("Não foi possível remover.");
    if (property.cover_image_url === path) {
      const next = images.find((i) => i.id !== id)?.url ?? null;
      await supabase.from("properties").update({ cover_image_url: next }).eq("id", property.id);
    }
    q.refetch();
    onChange();
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl">Fotos</h2>
        <Button asChild variant="outline" disabled={uploading}>
          <label className="cursor-pointer"><Upload />{uploading ? "Enviando..." : "Enviar fotos"}
            <input type="file" accept="image/*" multiple className="sr-only" disabled={uploading} onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
          </label>
        </Button>
      </div>
      {q.isLoading ? <div className="h-32 animate-pulse rounded-lg bg-muted" /> : !images.length ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhuma foto. Envie várias de uma vez; a primeira vira capa.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {images.map((img) => {
            const isCover = property.cover_image_url === img.url;
            return (
              <div key={img.id} className={cn("group relative aspect-[4/3] overflow-hidden rounded-lg bg-muted", isCover && "ring-2 ring-primary")}>
                {img.signed && <img src={img.signed} alt="" className="h-full w-full object-cover" />}
                {isCover && <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">Capa</span>}
                <div className="absolute inset-x-2 bottom-2 flex justify-end gap-1">
                  {!isCover && <Button type="button" size="icon" variant="secondary" className="h-7 w-7" aria-label="Definir capa" onClick={() => setCover(img.url)}><Star /></Button>}
                  <Button type="button" size="icon" variant="destructive" className="h-7 w-7" aria-label="Remover foto" onClick={() => remove(img.id, img.url)}><Trash2 /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
