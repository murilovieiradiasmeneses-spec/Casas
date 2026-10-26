import { createFileRoute } from "@tanstack/react-router";
import { BrandSettings } from "@/components/admin/BrandSettings";

export const Route = createFileRoute("/cliente/marca")({ component: BrandSettings });
