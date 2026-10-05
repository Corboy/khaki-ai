import type { MetadataRoute } from "next";

import { KHAKI_CONFIG } from "@/config/khaki";

/**
 * The Android side of "add to home screen".
 *
 * Without this file the app is not installable: Chrome on Android creates a
 * bookmark with a screenshot for a thumbnail, opens it in a browser tab with
 * the URL bar and the tab strip, and it does not appear in the app drawer. iOS
 * had been looked after — `appleWebApp` and `apple-touch-icon` were both set —
 * so the phone the studio's customers are more likely to carry was getting the
 * worse of the two experiences.
 *
 * `standalone` is the important one: it removes the browser chrome, so opening
 * the icon looks like opening an app rather than a website.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Khaki AI — Picha na Video za Sendoff & Harusi",
    short_name: "Khaki AI",
    description:
      "Uliza kuhusu packages za sendoff na harusi, bei, drone shots na booking — upate jibu papo hapo.",

    /*
     * Root, not a deep link. The app keeps conversations on the device, so
     * starting at "/" is what reopens the thread the customer was in rather
     * than a blank one.
     */
    start_url: "/",
    scope: "/",

    display: "standalone",
    orientation: "portrait",

    /* Matches the app's own Obsidian background, so the splash screen and the
       first painted frame are the same colour rather than flashing white. */
    background_color: "#000000",
    theme_color: "#000000",

    lang: "sw",
    dir: "ltr",
    categories: ["business", "photo", "lifestyle"],

    icons: [
      { src: "/images/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/images/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      /*
       * Separate maskable art. Android crops launcher icons to whatever shape
       * the launcher uses — a circle on Pixel, a squircle on Samsung — so the
       * logo is drawn inside the middle 60% and the rest is background. Reusing
       * the plain icon here would have the KM mark clipped at the edges on most
       * phones.
       */
      {
        src: "/images/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
