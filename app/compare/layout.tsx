import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Харьцуулалт",
  description:
    "Сэдвүүдийн трэндийг хооронд нь харьцуулж, цаг хугацааны явцад хэрхэн өөрчлөгдсөнийг графикаар харах.",
};

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
