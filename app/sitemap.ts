import type { MetadataRoute } from "next";

const BASE_URL = "https://trend.byamb4.dev";

async function fetchTagIds(): Promise<number[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/trends/top?limit=50`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json ?? []).map((tag: { id: number }) => tag.id);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/posts`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/news`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/network`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/compare`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date("2026-03-17"),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  const tagIds = await fetchTagIds();

  const tagPages: MetadataRoute.Sitemap = tagIds.map((id) => ({
    url: `${BASE_URL}/tag/${id}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...tagPages];
}
