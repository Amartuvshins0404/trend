import type { Metadata } from "next";
import "@fontsource-variable/nunito";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  metadataBase: new URL("https://trend.byamb4.dev"),
  title: {
    template: "%s | Цаагуур",
    default: "Цаагуур чинь юу болж байна — Монголын трэнд",
  },
  description: "Facebook болон мэдээний сайтуудын өгөгдлийг AI-аар шинжилж, Монголд юу трэнд болж байгааг бодит цагаар харуулна. Өдөр бүр автоматаар шинэчлэгддэг нээлттэй платформ.",
  keywords: ["Монгол трэнд", "Facebook трэнд", "Монгол мэдээ", "Цаагуур", "сошиал медиа шинжилгээ", "AI", "бодит цагийн трэнд", "Монголын мэдээ"],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Цаагуур чинь юу болж байна — Монголын трэнд",
    description: "Facebook болон мэдээний сайтуудын өгөгдлийг AI-аар шинжилж, Монголд юу трэнд болж байгааг бодит цагаар харуулна. Өдөр бүр автоматаар шинэчлэгддэг.",
    type: "website",
    locale: "mn_MN",
    url: "https://trend.byamb4.dev",
    siteName: "Цаагуур",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Цаагуур — Mongolia Trend Analytics",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Цаагуур чинь юу болж байна — Монголын трэнд",
    description: "Facebook болон мэдээний сайтуудын өгөгдлийг AI-аар шинжилж, Монголд юу трэнд болж байгааг бодит цагаар харуулна. Өдөр бүр автоматаар шинэчлэгддэг.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://trend.byamb4.dev",
  },
  manifest: "/manifest.json",
};

// Inline script to prevent flash of wrong theme (FOUC).
// This is a static string with no user input -- safe to inline.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Цаагуур",
  "url": "https://trend.byamb4.dev",
  "description": "Монголын Facebook болон мэдээний сайтуудын трэнд шинжилгээ",
  "inLanguage": "mn-MN",
};

const themeInitScript = `
(function() {
  try {
    var theme = localStorage.getItem('trend-theme');
    var isDark = theme === 'dark' || (!theme || theme === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) document.documentElement.classList.add('dark');
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon.svg" />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-NQ8502GH9Q" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-NQ8502GH9Q');`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body className="antialiased font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
