import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";
  const routes = [
    "",
    "/games",
    "/games/slots",
    "/games/slots/cat-meow",
    "/games/slots/neko-nights",
    "/games/roulette",
    "/bonuses",
    "/login",
    "/register",
  ];
  const now = new Date();
  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}
