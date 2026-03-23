import type { Metadata } from "next";

const API_URL = process.env.API_URL || "http://localhost:8001";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const res = await fetch(`${API_URL}/api/trends/tag/${id}?days=7`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return { title: "Сэдэв" };
    }

    const data = await res.json();
    const tagName = data.tag?.name || "Сэдэв";
    const category = data.tag?.category;
    const totalPosts = data.timeline?.reduce(
      (s: number, d: { postCount: number }) => s + d.postCount,
      0
    ) || 0;
    const totalNews = data.timeline?.reduce(
      (s: number, d: { newsCount: number }) => s + d.newsCount,
      0
    ) || 0;

    const description = `"${tagName}" сэдвийн трэнд шинжилгээ — ${totalPosts} Facebook пост, ${totalNews} мэдээ. ${category === "entity" ? "Нэр томъёо" : category === "location" ? "Байршил" : "Сэдэв"} | Цаагуур`;

    return {
      title: tagName,
      description,
      openGraph: {
        title: `${tagName} | Цаагуур`,
        description,
        type: "article",
        locale: "mn_MN",
        siteName: "Цаагуур",
      },
      twitter: {
        card: "summary_large_image",
        title: `${tagName} | Цаагуур`,
        description,
      },
    };
  } catch {
    return { title: "Сэдэв" };
  }
}

export default function TagLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
