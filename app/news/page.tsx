"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ExternalLink, Newspaper, Clock, Globe, ChevronRight } from "lucide-react";
import { Header } from "@/components/header";
import { formatDate } from "@/lib/utils";

interface NewsSource {
  id: string;
  name: string;
  url: string;
  articleCount: number;
}

interface Article {
  id: string;
  title: string;
  content: string;
  url: string;
  imageUrl: string | null;
  author: string | null;
  category: string | null;
  source: string | null;
  sourceId: string;
  tags: { name: string; category: string | null; sentiment: string | null }[];
  publishedDate: string | null;
}

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  topic: { bg: "bg-primary/10", text: "text-primary" },
  entity: { bg: "bg-[#e6f4ea] dark:bg-[#1a8b3f]/20", text: "text-[#1a7431] dark:text-[#4ade80]" },
  location: { bg: "bg-[#f5a623]/10", text: "text-[#c68400] dark:text-[#ffc94d]" },
};


export default function NewsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background"><Header /></div>}>
      <NewsContent />
    </Suspense>
  );
}

function NewsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const perPage = 30;
  const days = 14;

  const activeSource = searchParams.get("source") || null;

  const setActiveSource = (sourceId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (sourceId) {
      params.set("source", sourceId);
    } else {
      params.delete("source");
    }
    params.delete("page");
    router.push(`/news?${params}`);
  };

  useEffect(() => {
    fetch("/api/news/sources")
      .then((r) => r.json())
      .then((d) => setSources(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setPage(0);
  }, [activeSource]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      days: String(days),
      limit: String(perPage),
      offset: String(page * perPage),
    });
    if (activeSource) params.set("source", activeSource);
    fetch(`/api/news/?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setArticles(d.articles || []);
        setTotal(d.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeSource, page]);

  const totalArticles = sources.reduce((sum, s) => sum + s.articleCount, 0);
  const activeSourceName = activeSource ? sources.find((s) => s.id === activeSource)?.name : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Left: Articles */}
          <div className="lg:col-span-8 space-y-5">
            {/* Title */}
            <div className="animate-fade-in-up">
              <div className="flex items-center gap-2.5 mb-1">
                <Newspaper className="h-4 w-4 text-primary" />
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  {activeSourceName || "Бүх мэдээ"}
                </h1>
                {activeSource && (
                  <button
                    onClick={() => setActiveSource(null)}
                    className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
                  >
                    Цэвэрлэх
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {loading ? "Уншиж байна..." : `${total.toLocaleString()} мэдээ · сүүлийн ${days} хоног`}
              </p>
            </div>

            {/* Articles */}
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-24 skeleton-shimmer rounded-lg" style={{ animationDelay: `${i * 80}ms` }} />
                ))}
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-20">
                <Newspaper className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Мэдээ олдсонгүй</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {articles.map((article, i) => (
                  <a
                    key={article.id}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block bg-card rounded-lg shadow-sm p-3.5 sm:p-4 hover:bg-[var(--hover-surface)] transition-colors animate-fade-in-up"
                    style={{ animationDelay: `${i * 25}ms` }}
                  >
                    <div className="flex gap-3.5 sm:gap-4">
                      {/* Thumbnail */}
                      {article.imageUrl && (
                        <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-secondary">
                          <img
                            src={article.imageUrl}
                            alt={article.title || "Мэдээний зураг"}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
                          />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        {/* Source + time */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            {article.source}
                          </span>
                          {article.category && (
                            <span className="text-[10px] text-muted-foreground hidden sm:inline">{article.category}</span>
                          )}
                          <div className="flex items-center gap-1 ml-auto text-[10px] text-muted-foreground shrink-0">
                            <Clock className="h-2.5 w-2.5" />
                            {article.publishedDate ? formatDate(article.publishedDate, "time") : ""}
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug mb-1.5">
                          {article.title}
                        </h3>

                        {/* Content */}
                        <p className="text-[12px] leading-relaxed text-muted-foreground line-clamp-2 mb-2 hidden sm:block">
                          {article.content}
                        </p>

                        {/* Tags + link */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {article.tags.slice(0, 3).map((tag) => {
                            const tc = TAG_COLORS[tag.category || "topic"] || TAG_COLORS.topic;
                            return (
                              <span
                                key={tag.name}
                                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${tc.bg} ${tc.text}`}
                              >
                                {tag.name}
                              </span>
                            );
                          })}
                          <ExternalLink className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" />
                        </div>
                      </div>
                    </div>
                  </a>
                ))}

                {/* Pagination */}
                {total > perPage && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <button
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="px-4 py-2 text-[13px] font-medium rounded-md bg-secondary text-foreground hover:bg-border disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Өмнөх
                    </button>
                    <span className="text-xs text-muted-foreground tabular-nums px-3">
                      {page + 1} / {Math.ceil(total / perPage)}
                    </span>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={(page + 1) * perPage >= total}
                      className="px-4 py-2 text-[13px] font-medium rounded-md bg-secondary text-foreground hover:bg-border disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Дараах →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Sources sidebar */}
          <div className="lg:col-span-4 animate-slide-in-right" style={{ animationDelay: "150ms" }}>
            <div className="bg-card rounded-lg shadow-sm sticky top-[72px]">
              <div className="p-5 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    Мэдээний эх сурвалж
                  </h2>
                  <span className="text-[10px] text-muted-foreground tabular-nums bg-secondary px-2 py-0.5 rounded-full">
                    {sources.length}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Нийт {totalArticles.toLocaleString()} мэдээ
                </p>
              </div>

              <div className="px-2 pb-3 space-y-0.5">
                {/* All button */}
                <button
                  onClick={() => setActiveSource(null)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-md transition-colors ${
                    activeSource === null
                      ? "bg-primary/10"
                      : "hover:bg-secondary"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    activeSource === null
                      ? "bg-primary/20"
                      : "bg-secondary"
                  }`}>
                    <Newspaper className={`h-4 w-4 ${
                      activeSource === null ? "text-primary" : "text-muted-foreground"
                    }`} />
                  </div>
                  <div className="flex-1 text-left">
                    <span className={`text-[13px] font-medium ${
                      activeSource === null ? "text-primary" : "text-foreground/80"
                    }`}>
                      Бүгд
                    </span>
                  </div>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {totalArticles.toLocaleString()}
                  </span>
                </button>

                {/* Source list */}
                {sources.map((source) => {
                  const isActive = activeSource === source.id;
                  const pct = totalArticles > 0 ? (source.articleCount / totalArticles) * 100 : 0;

                  return (
                    <button
                      key={source.id}
                      onClick={() => setActiveSource(source.id)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-md transition-colors group ${
                        isActive
                          ? "bg-primary/10"
                          : "hover:bg-secondary"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold ${
                        isActive
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                          : "bg-secondary text-muted-foreground group-hover:text-foreground"
                      }`}>
                        {source.name.slice(0, 2)}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[13px] font-medium truncate ${
                            isActive ? "text-primary" : "text-foreground/80 group-hover:text-foreground"
                          }`}>
                            {source.name}
                          </span>
                        </div>
                        {/* Mini progress bar */}
                        <div className="mt-1.5 h-1 w-full bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isActive ? "bg-primary" : "bg-muted-foreground/20"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                          {source.articleCount}
                        </span>
                        <ChevronRight className={`h-3 w-3 transition-all ${
                          isActive ? "text-primary" : "text-muted-foreground/30 group-hover:text-muted-foreground"
                        }`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
