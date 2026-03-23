import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Тухай",
  description:
    "Цаагуур төслийн тухай — Facebook болон мэдээний сайтуудын өгөгдлийг AI-аар шинжилж, Монголд юу трэнд болж байгааг харуулдаг нээлттэй платформ.",
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
