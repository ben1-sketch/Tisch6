import type { MetadataRoute } from "next";
import { appManifest } from "@/lib/manifest";

/** Tisch6 als Web-App – wer die Startseite zum Home-Bildschirm hinzufügt, startet dort. */
export default function manifest(): MetadataRoute.Manifest {
  return appManifest("/de", "/");
}
