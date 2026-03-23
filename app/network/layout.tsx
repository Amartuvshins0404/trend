import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Сүлжээ",
  description:
    "Сэдвүүдийн хоорондын холбоог сүлжээ графикаар харуулж, ямар сэдвүүд хамт яригддагийг дүрслэн харуулна.",
};

export default function NetworkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
