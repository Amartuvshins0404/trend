"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Network, Newspaper, GitCompareArrows, Sun, Moon, Info } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

const NAV_ITEMS = [
  { href: "/", label: "Трэнд", icon: BarChart3 },
  { href: "/network", label: "Сүлжээ", icon: Network },
  { href: "/compare", label: "Харьцуулах", icon: GitCompareArrows },
  { href: "/news", label: "Мэдээ", icon: Newspaper },
  { href: "/about", label: "Тухай", icon: Info },
];

export function Header({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <header className="sticky top-0 z-50 bg-card shadow-[0_2px_4px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-none dark:border-b dark:border-border">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 h-[56px] flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Brand — Facebook blue, bold */}
          <Link href="/" className="flex items-center">
            <span className="text-[20px] font-bold text-primary">Цаагуур</span>
          </Link>

          {/* Nav — Facebook tab style with bottom indicator feel via filled bg */}
          <nav className="flex items-center gap-0.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[14px] rounded-md transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {children && <div className="hidden sm:flex items-center">{children}</div>}
          <a href="https://instagram.com/byamb4" target="_blank" rel="noopener noreferrer" className="hidden sm:flex text-[12px] text-muted-foreground hover:text-foreground transition-colors items-center gap-1 px-2.5 py-1 rounded-full bg-secondary">
            made by <span className="font-semibold">ByamB4</span> <span className="text-red-500">❤️</span>
          </a>
          {/* Theme toggle — Facebook circular icon button */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary hover:bg-border transition-colors text-muted-foreground"
            aria-label="Харанхуй/Гэрэл горим сэлгэх"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-[18px] w-[18px]" />
            ) : (
              <Moon className="h-[18px] w-[18px]" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
