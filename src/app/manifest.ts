import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kunoz — Workforce Attendance",
    short_name: "Kunoz",
    description:
      "Reliable attendance tracking for Kunoz construction and manufacturing.",
    start_url: "/dashboard/attendance",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#B8163A",
    orientation: "portrait",
    icons: [
      { src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
