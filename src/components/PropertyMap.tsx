import { useEffect, useRef } from "react";
import type * as Leaflet from "leaflet";
import { formatPrice, type PropertyWithCover } from "@/lib/properties";

const BRAZIL: [number, number] = [-15.8, -47.9];

async function loadLeaflet() {
  const L = (await import("leaflet")).default;
  await import("leaflet/dist/leaflet.css");
  return L;
}

function shortPrice(n: number) {
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  if (n >= 1000) return `R$ ${Math.round(n / 1000)} mil`;
  return `R$ ${n}`;
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function PropertyMap({
  items,
  selectedId,
  onSelect,
  className,
}: {
  items: PropertyWithCover[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const markers = useRef(new Map<string, Leaflet.Marker>());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !el.current) return;
      if (!map.current) {
        map.current = L.map(el.current, { scrollWheelZoom: true }).setView(BRAZIL, 4);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap",
          maxZoom: 19,
        }).addTo(map.current);
      }
      markers.current.forEach((m) => m.remove());
      markers.current.clear();
      const pts: [number, number][] = [];
      items.forEach((p) => {
        if (p.latitude == null || p.longitude == null) return;
        const icon = L.divIcon({ className: "", html: `<span class="casas-pin">${shortPrice(Number(p.price))}</span>`, iconSize: [0, 0] });
        const m = L.marker([p.latitude, p.longitude], { icon }).addTo(map.current!);
        m.bindPopup(
          `<div class="casas-pop">${p.coverUrl ? `<img src="${esc(p.coverUrl)}" alt="">` : ""}<div class="b"><div class="p">${esc(formatPrice(p.price, p.purpose))}</div><div class="n">${esc(p.neighborhood)}, ${esc(p.city)}</div><a href="/imovel/${esc(p.slug)}">Ver imóvel</a></div></div>`,
        );
        m.on("click", () => onSelectRef.current?.(p.id));
        markers.current.set(p.id, m);
        pts.push([p.latitude, p.longitude]);
      });
      if (pts.length === 1) map.current.setView(pts[0], 14);
      else if (pts.length > 1) map.current.fitBounds(pts, { padding: [40, 40] });
      setTimeout(() => map.current?.invalidateSize(), 50);
    });
    return () => {
      cancelled = true;
    };
  }, [items]);

  useEffect(() => {
    markers.current.forEach((m, id) => {
      const span = m.getElement()?.querySelector(".casas-pin");
      span?.classList.toggle("active", id === selectedId);
      if (id === selectedId) m.setZIndexOffset(1000);
      else m.setZIndexOffset(0);
    });
    const m = selectedId ? markers.current.get(selectedId) : null;
    if (m && map.current) map.current.panTo(m.getLatLng());
  }, [selectedId, items]);

  useEffect(() => () => {
    map.current?.remove();
    map.current = null;
  }, []);

  return <div ref={el} className={className} />;
}

export function PinPicker({
  lat,
  lng,
  onChange,
  className,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const marker = useRef<Leaflet.Marker | null>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !el.current || map.current) return;
      LRef.current = L;
      const start: [number, number] = lat != null && lng != null ? [lat, lng] : BRAZIL;
      map.current = L.map(el.current).setView(start, lat != null ? 15 : 4);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap" }).addTo(map.current);
      map.current.on("click", (e) => cb.current(+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)));
      // Render the pre-existing pin as soon as Leaflet loads. The coordinates
      // effect may already have fired while this async import was pending.
      if (lat != null && lng != null) {
        const icon = L.divIcon({ className: "", html: '<span class="casas-pin active">Aqui</span>', iconSize: [0, 0] });
        marker.current = L.marker([lat, lng], { icon }).addTo(map.current);
      }
      setTimeout(() => map.current?.invalidateSize(), 50);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const L = LRef.current;
    if (!L || !map.current) return;
    if (lat == null || lng == null) return;
    const icon = L.divIcon({ className: "", html: `<span class="casas-pin active">Aqui</span>`, iconSize: [0, 0] });
    if (!marker.current) marker.current = L.marker([lat, lng], { icon }).addTo(map.current);
    else marker.current.setLatLng([lat, lng]);
  }, [lat, lng]);

  return <div ref={el} className={className} />;
}
