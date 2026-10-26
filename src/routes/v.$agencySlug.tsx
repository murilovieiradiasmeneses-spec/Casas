import { Outlet, createFileRoute } from "@tanstack/react-router";

/** Tenant-specific routes share this parent without inheriting the CASAS public header. */
export const Route = createFileRoute("/v/$agencySlug")({
  ssr: false,
  component: () => <Outlet />,
});
