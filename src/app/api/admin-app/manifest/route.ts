import { NextResponse } from "next/server";
import { adminManifest } from "@/lib/manifest";

/** Manifest der Admin-App – öffentlich, enthält nur Name, Farben und Symbole. */
export function GET() {
  return new NextResponse(JSON.stringify(adminManifest()), {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" },
  });
}
