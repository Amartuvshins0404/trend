import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="text-6xl font-bold text-muted-foreground/30 mb-4">404</div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Хуудас олдсонгүй</h2>
        <p className="text-sm text-muted-foreground mb-6">Таны хайсан хуудас байхгүй эсвэл шилжсэн байна.</p>
        <Link
          href="/"
          className="inline-block px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          Нүүр хуудас руу буцах
        </Link>
      </div>
    </div>
  );
}
