import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "India Uncharted",
    short_name: "India Uncharted",
    description: "Private, tailor-made journeys across India — Rajasthan's desert cities, Kashmir's valleys, Ladakh's high passes, Goa's yoga retreats.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4eddf",
    theme_color: "#f4eddf",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
