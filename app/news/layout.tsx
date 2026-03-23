import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Мэдээ",
  description:
    "Монголын мэдээний сайтуудын хамгийн сүүлийн мэдээллүүдийг AI-аар ангилж, сэдвээр нь бүлэглэн харуулж байна.",
};

export default function NewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
