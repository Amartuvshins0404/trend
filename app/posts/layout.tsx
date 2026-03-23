import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Постууд",
  description:
    "Facebook-ийн постуудыг сэдэв, хандлага, идэвхжлээр нь шүүж харах. Монголын сошиал медиагийн агуулгыг нэг дороос үзэх боломжтой.",
};

export default function PostsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
