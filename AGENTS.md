<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Authorization is enforced by Postgres RLS via `public.has_role(uid,'admin')`; the `/admin` route check is UX only. Why: frontend checks are bypassable.
- Admins are granted only by manual SQL insert into `public.user_roles` (see docs/ADMIN.md); never add a public path that creates admins.
- Property photos live in the private `property-images` bucket (public buckets are blocked); DB stores storage paths and the UI signs them via `signPaths`. Why: workspace policy.
- Every property has `agency_id` for future multi-tenant; MVP uses the single `casas` agency.
- Leaflet is imported dynamically inside effects (`src/components/PropertyMap.tsx`) and rendered under `<ClientOnly>`. Why: it touches `window` at import.
