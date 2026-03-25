"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import {
  getCategoryStyle, getSentimentKey, getSentimentColor,
  calculateAverageSentiment, SENTIMENT_STYLES,
} from "@/lib/constants";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import {
  TrendingUp, TrendingDown, Minus, MessageSquare,
  Search, Flame, ThumbsUp, Share2,
  BarChart3, ExternalLink, Zap,
  Newspaper, Play, Pause, ChevronLeft, ChevronRight, Clock,
} from "lucide-react";
import { Header } from "@/components/header";
import { useDashboardData } from "@/lib/hooks/use-dashboard-data";
import { useTagSearch } from "@/lib/hooks/use-tag-search";
import { useTimelinePlayer } from "@/lib/hooks/use-timeline-player";
import type { TagTrend, Post, DaySnapshot } from "@/lib/hooks/use-dashboard-data";

export default function Home() {
  const { trends, overview, hotPosts, tlSnapshots, loading } = useDashboardData(14);
  const { query, filtered, searching, handleSearch, searchResults } = useTagSearch(trends);
  const { currentIndex: tlIndex, playing: tlPlaying, play: tlPlay, pause: tlPause, setIndex: tlSetIndex } = useTimelinePlayer(tlSnapshots.length);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 py-4 sm:py-6">
        <h1 className="sr-only">Цаагуур — Монголын Facebook болон мэдээний трэнд шинжилгээ</h1>
        <p className="sr-only">
          Монголын Facebook болон мэдээний сайтуудаас цуглуулсан өгөгдлийг AI-аар шинжилж, юу трэнд болж байгааг бодит цагаар харуулдаг нээлттэй платформ. Өдөр бүр автоматаар шинэчлэгдэж, хамгийн их яригдаж буй сэдвүүд, мэдээ, нийтлэлүүдийг нэгтгэн дүн шинжилгээ хийнэ. Цаагуур нь Монголын сошиал медиа болон мэдээний орчны трэнд, хандлагыг хянах хамгийн хялбар арга юм.
        </p>
        {overview?.lastUpdated && (
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex items-center gap-2.5 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 backdrop-blur-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
              </span>
              <span className="text-sm font-medium text-foreground/80">
                Сүүлд шинэчлэгдсэн: <span className="font-semibold text-foreground">{formatDate(overview.lastUpdated, "time")}</span>
              </span>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

          {/* ─── Left column ─── */}
          <div className="lg:col-span-8 space-y-4">

            {/* Hot topics */}
            <section className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
              <SectionLabel icon={<Flame className="h-4 w-4 text-[#c0392b]" />} title="Халуун сэдвүүд" />
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[0, 1, 2].map((i) => <div key={i} className="h-[180px] skeleton-shimmer" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {trends.slice(0, 3).map((tag, i) => (
                    <HotCard key={tag.id} tag={tag} rank={i} />
                  ))}
                </div>
              )}
            </section>

            {/* Timeline leaderboard — replaces static Чансаа */}
            {!loading && tlSnapshots.length > 0 && (
            <section className="animate-fade-in-up" style={{ animationDelay: "250ms" }}>
              <TimelineSection
                snapshots={tlSnapshots}
                currentIndex={tlIndex}
                setCurrentIndex={tlSetIndex}
                playing={tlPlaying}
                onPlay={tlPlay}
                onPause={tlPause}
              />
            </section>
            )}

            {/* Leaderboard - shows if timeline has no data */}
            {!loading && tlSnapshots.length === 0 && trends.length > 0 && (
            <section className="animate-fade-in-up" style={{ animationDelay: "250ms" }}>
              <div className="bg-card rounded-lg shadow-sm p-4">
                <SectionLabel icon={<BarChart3 className="h-4 w-4 text-primary" />} title="Чансаа" />
                <div className="py-6 text-center text-sm text-muted-foreground">Мэдээлэл ачааллаж байна...</div>
              </div>
            </section>
            )}

            {/* Facebook page banner */}
            <a
              href="https://www.facebook.com/byamb4meme"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-[#1877f2]/10 to-[#1877f2]/5 dark:from-[#2d88ff]/10 dark:to-[#2d88ff]/5 border border-[#1877f2]/20 dark:border-[#2d88ff]/20 hover:border-[#1877f2]/40 dark:hover:border-[#2d88ff]/40 transition-all animate-fade-in-up"
              style={{ animationDelay: "350ms" }}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1877f2] dark:bg-[#2d88ff] shrink-0">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-foreground">Цаагуур — Facebook</div>
                <div className="text-[12px] text-muted-foreground">Өдөр бүр 20:00-д трэнд тоймыг Facebook хуудсанд нийтэлдэг</div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-[#1877f2] dark:group-hover:text-[#2d88ff] transition-colors shrink-0" />
            </a>

            {/* Trending posts */}
            <section className="animate-fade-in-up" style={{ animationDelay: "300ms" }}>
              <SectionLabel icon={<Zap className="h-4 w-4 text-[#f5a623]" />} title="Их яригдаж байгаа" />
              {loading ? (
                <div className="space-y-2">
                  {[0, 1, 2, 3].map((i) => <div key={i} className="h-[80px] skeleton-shimmer" />)}
                </div>
              ) : (
                <div className="space-y-2">
                  {hotPosts.map((post, i) => (
                    <PostCard key={post.postId} post={post} delay={i * 30} />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* ─── Right sidebar ─── */}
          <div className="lg:col-span-4 lg:mt-[36px] animate-slide-in-right" style={{ animationDelay: "100ms" }}>
            <div className="bg-card rounded-lg shadow-sm sticky top-[72px] h-[calc(100vh-90px)] flex flex-col">
              <div className="p-4 pb-3">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[15px] font-semibold text-foreground">Бүх сэдвүүд</h2>
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{searchResults !== null ? filtered.length : trends.length}</span>
                </div>
                {/* Facebook-style search — rounded-full, filled bg, no border */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Сэдэв хайх..."
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-[14px] bg-secondary rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="px-2 pb-2 flex-1 overflow-y-auto custom-scrollbar">
                {filtered.map((t, i) => {
                  const cat = getCategoryStyle(t.category);
                  const avg = calculateAverageSentiment(t.dailyData.map(d => d.sentiment)) ?? 0;
                  const changeColor = getSentimentColor(avg) === "#1a8b3f" ? "text-[#1a8b3f]" : getSentimentColor(avg) === "#c0392b" ? "text-[#c0392b]" : "text-muted-foreground/50";

                  return (
                    <Link key={t.id} href={`/tag/${t.id}`} className="group flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-secondary transition-colors">
                      <span className="text-xs text-muted-foreground w-5 text-right tabular-nums">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`shrink-0 w-2 h-2 rounded-full ${cat.dot}`} />
                          <span className="text-[14px] font-medium text-foreground group-hover:text-primary transition-colors truncate">{t.name}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 pl-3.5">
                          <MiniSparkline data={t.dailyData.map(d => d.postCount)} sentiment={avg} />
                          <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{t.score.toFixed(1)}</span>
                          <span className={`text-[11px] tabular-nums shrink-0 ${changeColor}`}>
                            {t.postCount}p{t.newsCount > 0 ? ` ${t.newsCount}n` : ""}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
                {searching && <div className="py-10 text-center text-sm text-muted-foreground">Хайж байна...</div>}
                {!searching && filtered.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">Олдсонгүй</div>}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ── Mini Sparkline ─── */
function MiniSparkline({ data, sentiment = 0 }: { data: number[]; sentiment?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 56, h = 16;
  const color = getSentimentColor(sentiment);
  const points = data.map((v, i) =>
    `${(i / (data.length - 1)) * w},${h - (v / max) * h}`
  ).join(' ');
  const areaPoints = `0,${h} ${points} ${w},${h}`;
  return (
    <svg width={w} height={h} className="shrink-0">
      <polygon points={areaPoints} fill={color} opacity="0.08" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Trend label mapping ─── */
const TREND_INFO: Record<string, { label: string; icon: typeof TrendingUp; color: string }> = {
  rising:  { label: "Өсч байна",   icon: TrendingUp,   color: "text-emerald-500" },
  falling: { label: "Буурч байна", icon: TrendingDown,  color: "text-red-400" },
  stable:  { label: "Тогтвортой",  icon: Minus,         color: "text-muted-foreground" },
};

/* ── Hot Topic Card ─── */
function HotCard({ tag, rank }: { tag: TagTrend; rank: number }) {
  const cat = getCategoryStyle(tag.category);
  const spark = tag.dailyData.map((d) => ({ v: d.postCount }));
  const total = tag.totalReactions + tag.totalComments + tag.totalShares;

  const avg = calculateAverageSentiment(tag.dailyData.map((d) => d.sentiment));
  const sentKey = getSentimentKey(avg);
  const sentStyle = avg !== null ? SENTIMENT_STYLES[sentKey] : null;

  const trend = TREND_INFO[tag.trend] || TREND_INFO.stable;
  const TrendIcon = trend.icon;
  const trendColor = tag.trend === "rising" ? "#22c55e" : tag.trend === "falling" ? "#ef4444" : "#8b8d91";

  const rankClass = rank === 0 ? "rank-gold" : rank === 1 ? "rank-silver" : "rank-bronze";

  return (
    <Link
      href={`/tag/${tag.id}`}
      className="group relative bg-card rounded-xl shadow-sm hover:shadow-md hover:bg-(--hover-surface) transition-all duration-200 overflow-hidden"
    >
      {/* Top accent bar */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${trendColor}40, ${trendColor}10)` }} />

      <div className="p-4">
        {/* Header: rank + trend + pills */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`${rankClass} w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-bold`}>
              {rank + 1}
            </span>
            <div className={`flex items-center gap-1 ${trend.color}`}>
              <TrendIcon className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold">{trend.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {tag.category && <span className={`text-[10px] px-2 py-0.5 rounded-full ${cat.bg} ${cat.text} font-medium`}>{cat.label}</span>}
            {sentStyle && <span className={`text-[10px] px-2 py-0.5 rounded-full ${sentStyle.bg} ${sentStyle.text}`}>{sentStyle.label}</span>}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-bold text-foreground group-hover:text-primary transition-colors leading-snug mb-3">
          {tag.name}
        </h3>

        {/* Sparkline or placeholder */}
        {spark.length > 1 ? (
          <div className="h-12 mb-3 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spark}>
                <defs>
                  <linearGradient id={`sp-${tag.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={trendColor} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={trendColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={trendColor} strokeWidth={2} fill={`url(#sp-${tag.id})`} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-12 mb-3 flex items-center justify-center rounded-md bg-secondary/50">
            <span className="text-[11px] text-muted-foreground/60">График байхгүй</span>
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1 tabular-nums"><MessageSquare className="h-3 w-3" />{tag.postCount}</span>
            {tag.newsCount > 0 && <span className="flex items-center gap-1 tabular-nums text-[#f5a623]"><Newspaper className="h-3 w-3" />{tag.newsCount}</span>}
            <span className="flex items-center gap-1 tabular-nums"><ThumbsUp className="h-3 w-3" />{total.toLocaleString()}</span>
          </div>
          <span className="text-[13px] font-extrabold tabular-nums text-foreground/70">{tag.score.toFixed(1)}</span>
        </div>
      </div>
    </Link>
  );
}

/* ── Post Card — Facebook feed item feel ─── */
function PostCard({ post, delay }: { post: Post; delay: number }) {
  const sentiments = post.tags.map((t) => t.sentiment).filter(Boolean);
  const dominant = sentiments.length > 0 ? sentiments[0] : "neutral";
  const sent = SENTIMENT_STYLES[dominant || "neutral"] || SENTIMENT_STYLES.neutral;

  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 bg-card rounded-lg shadow-sm p-3 sm:p-4 hover:bg-(--hover-surface) transition-colors animate-fade-in-up"
      style={{ animationDelay: `${150 + delay}ms` }}
    >
      {/* Like count — Facebook reaction style */}
      <div className="shrink-0 flex flex-col items-center justify-center w-12 rounded-lg bg-primary/5 py-2">
        <ThumbsUp className="h-3.5 w-3.5 text-primary mb-0.5" />
        <span className="text-sm font-bold text-foreground tabular-nums">
          {post.likes >= 1000 ? `${(post.likes / 1000).toFixed(1)}k` : post.likes}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {post.author && <span className="text-[13px] font-semibold text-foreground">{post.author}</span>}
          <span className="text-[11px] text-muted-foreground">
            {formatDate(post.createdAt)}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${sent.bg} ${sent.text}`}>{sent.label}</span>
        </div>

        <p className="text-[13px] text-secondary-foreground line-clamp-2 leading-relaxed mb-2">{post.content}</p>

        <div className="flex items-center gap-1.5 flex-wrap">
          {post.tags.slice(0, 3).map((tag) => {
            const tc = getCategoryStyle(tag.category);
            return (
              <span key={tag.name} className={`text-[10px] px-2 py-0.5 rounded-full ${tc.bg} ${tc.text} font-medium truncate max-w-[120px] sm:max-w-none`}>{tag.name}</span>
            );
          })}
          <div className="flex items-center gap-2 ml-auto text-[11px] text-muted-foreground tabular-nums shrink-0">
            <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{post.commentCount}</span>
            <span className="hidden sm:flex items-center gap-0.5"><Share2 className="h-3 w-3" />{post.shareCount}</span>
          </div>
        </div>
      </div>

      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all shrink-0 mt-1" />
    </a>
  );
}

/* ── Section label — Facebook-style, no uppercase ─── */
function SectionLabel({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
    </div>
  );
}

function sentimentBarFill(value: number | null): string {
  const key = getSentimentKey(value);
  if (key === "positive") return "bg-[#e6f4ea] dark:bg-[#1a8b3f]/25";
  if (key === "negative") return "bg-[#fce8e6] dark:bg-[#c0392b]/25";
  return "bg-[#8b8d91]/10 dark:bg-[#8b8d91]/15";
}

function sentimentIcon(value: number | null): string {
  const key = getSentimentKey(value);
  return key === "positive" ? "👍" : key === "negative" ? "👎" : "💬";
}

/* ── Тойм мэдээ - Summary + Daily toggle ─── */
function TimelineSection({
  snapshots,
  currentIndex,
  setCurrentIndex,
  playing,
  onPlay,
  onPause,
}: {
  snapshots: DaySnapshot[];
  currentIndex: number;
  setCurrentIndex: (i: number) => void;
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
}) {
  const [view, setView] = useState<"summary" | "daily">("summary");

  // === Summary view data ===
  const tagHistory = new Map<number, { name: string; scores: number[]; totalPosts: number; totalNews: number; sentiment: number }>();
  for (const snap of snapshots) {
    for (const tag of snap.tags) {
      if (!tagHistory.has(tag.id)) {
        tagHistory.set(tag.id, { name: tag.name, scores: new Array(snapshots.length).fill(0), totalPosts: 0, totalNews: 0, sentiment: 0 });
      }
      const h = tagHistory.get(tag.id)!;
      h.scores[snapshots.indexOf(snap)] = tag.score;
      h.totalPosts += tag.postCount;
      h.totalNews += tag.newsCount;
      h.sentiment = tag.sentiment ?? h.sentiment;
    }
  }

  const ranked = Array.from(tagHistory.entries())
    .map(([id, h]) => ({
      id, ...h,
      weightedScore: h.scores.reduce((sum, s, i) => sum + s * ((i + 1) / snapshots.length), 0),
    }))
    .sort((a, b) => b.weightedScore - a.weightedScore)
    .slice(0, 12);

  const getTrend = (scores: number[]) => {
    if (scores.length < 4) return "stable";
    const recent = scores.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const prev = scores.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
    if (prev === 0 && recent > 0) return "rising";
    if (recent > prev * 1.3) return "rising";
    if (recent < prev * 0.5) return "falling";
    return "stable";
  };

  // === Daily view data (last 7 days only) ===
  const dailySnapshots = snapshots.slice(-7);
  const dailyIndex = Math.min(currentIndex - Math.max(0, snapshots.length - 7), dailySnapshots.length - 1);
  const safeDailyIndex = Math.max(0, Math.min(dailyIndex, dailySnapshots.length - 1));
  const current = dailySnapshots[safeDailyIndex];
  const prev = safeDailyIndex > 0 ? dailySnapshots[safeDailyIndex - 1] : null;
  const prevRankMap = new Map<number, number>();
  if (prev) for (const t of prev.tags) prevRankMap.set(t.id, t.rank);

  return (
    <div className="bg-card rounded-lg shadow-sm p-4">
      <div className="flex items-center mb-3">
        {/* Left - title */}
        <SectionLabel icon={<Clock className="h-4 w-4 text-primary" />} title="Тойм мэдээ" />

        {/* Center - toggle */}
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-0.5 bg-secondary rounded-full p-0.5">
            <button onClick={() => setView("summary")}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors ${view === "summary" ? "bg-primary text-white" : "text-muted-foreground"}`}>
              Тойм
            </button>
            <button onClick={() => setView("daily")}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors ${view === "daily" ? "bg-primary text-white" : "text-muted-foreground"}`}>
              Өдрөөр
            </button>
          </div>
        </div>

        {/* Right - fixed width to prevent layout shift */}
        <div className="flex items-center gap-1.5 w-[100px] justify-end">
          {view === "daily" ? (
            <>
              <button onClick={() => setCurrentIndex(Math.max(0, snapshots.length - 7))}
                disabled={safeDailyIndex <= 0}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-secondary hover:bg-border disabled:opacity-30 transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => playing ? onPause() : onPlay()}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 transition-colors">
                {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
              </button>
              <button onClick={() => setCurrentIndex(Math.min(snapshots.length - 1, (snapshots.length - 7) + safeDailyIndex + 1))}
                disabled={safeDailyIndex >= dailySnapshots.length - 1}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-secondary hover:bg-border disabled:opacity-30 transition-colors">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <span className="text-[11px] text-muted-foreground">{snapshots.length} хоног</span>
          )}
        </div>
      </div>

      {view === "summary" ? (
        /* === SUMMARY VIEW === */
        <div className="space-y-1">
          {ranked.map((tag, i) => {
            const maxScore = ranked[0]?.weightedScore || 1;
            const pct = (tag.weightedScore / maxScore) * 100;
            const trend = getTrend(tag.scores);
            const barFill = sentimentBarFill(tag.sentiment);
            const icon = sentimentIcon(tag.sentiment);
            const sparkW = 56, sparkH = 18;
            const maxS = Math.max(...tag.scores, 1);
            const points = tag.scores.map((s, j) => `${(j / (tag.scores.length - 1)) * sparkW},${sparkH - (s / maxS) * sparkH}`).join(" ");
            const sparkColor = trend === "rising" ? "#22c55e" : trend === "falling" ? "#ef4444" : "#8b8d91";

            return (
              <Link key={tag.id} href={`/tag/${tag.id}`} className="group block">
                <div className="relative flex items-center h-10 rounded-md overflow-hidden">
                  <div className={`absolute left-0 top-0 bottom-0 ${barFill} animate-bar-grow`} style={{ width: `${pct}%`, animationDelay: `${100 + i * 40}ms` }} />
                  <div className="relative z-10 flex items-center w-full px-2.5">
                    <span className={`text-[12px] font-bold tabular-nums w-5 text-center ${i < 3 ? "text-primary" : "text-muted-foreground"}`}>{i + 1}</span>
                    <div className="w-5 flex items-center justify-center ml-1">
                      {trend === "rising" ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : trend === "falling" ? <TrendingDown className="h-3 w-3 text-red-400" /> : <Minus className="h-3 w-3 text-muted-foreground/20" />}
                    </div>
                    <span className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors truncate flex-1 ml-1.5">{icon} {tag.name}</span>
                    <svg width={sparkW} height={sparkH} className="shrink-0 ml-2">
                      <polyline points={points} fill="none" stroke={sparkColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      {tag.totalNews > 0 && <span className="text-[10px] text-[#f5a623] tabular-nums flex items-center gap-0.5"><Newspaper className="h-2.5 w-2.5" />{tag.totalNews}</span>}
                      <span className="text-[11px] text-muted-foreground tabular-nums">{tag.totalPosts}p</span>
                      <span className="text-[11px] font-bold tabular-nums text-foreground/60">{tag.weightedScore.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* === DAILY VIEW === */
        <>
          <div className="flex gap-1 mb-3">
            {dailySnapshots.map((snap, i) => {
              const isActive = i === safeDailyIndex;
              const isPast = i < safeDailyIndex;
              const d = new Date(snap.date + "T00:00:00Z");
              const globalIdx = snapshots.length - 7 + i;
              return (
                <button key={snap.date} onClick={() => setCurrentIndex(Math.max(0, globalIdx))}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-md transition-all text-center ${
                    isActive ? "bg-primary/15 ring-1 ring-primary/30" : isPast ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-secondary"
                  }`}>
                  <span className={`text-[10px] ${isActive ? "text-primary font-bold" : "text-muted-foreground"}`}>
                    {["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"][d.getUTCDay()]}
                  </span>
                  <span className={`text-[13px] font-semibold tabular-nums ${isActive ? "text-primary" : "text-foreground/70"}`}>
                    {d.getUTCDate()}
                  </span>
                  <div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-primary" : isPast ? "bg-primary/30" : "bg-border"}`} />
                </button>
              );
            })}
          </div>
          <div className="space-y-1">
            {current?.tags.map((tag) => {
              const prevRank = prevRankMap.get(tag.id);
              const isNew = prev && prevRank === undefined;
              const rankChange = prevRank !== undefined ? prevRank - tag.rank : 0;
              const maxScore = current.tags[0]?.score || 1;
              const pct = (tag.score / maxScore) * 100;
              const barFill = sentimentBarFill(tag.sentiment);
              const icon = sentimentIcon(tag.sentiment);

              return (
                <Link key={tag.id} href={`/tag/${tag.id}`} className="group block">
                  <div className="relative flex items-center h-9 rounded-md overflow-hidden">
                    <div className={`absolute left-0 top-0 bottom-0 ${barFill} transition-all duration-500`} style={{ width: `${pct}%` }} />
                    <div className="relative z-10 flex items-center w-full px-2.5">
                      <span className={`text-[12px] font-bold tabular-nums w-5 text-center ${tag.rank <= 3 ? "text-primary" : "text-muted-foreground"}`}>{tag.rank}</span>
                      <div className="w-6 flex items-center justify-center ml-1">
                        {isNew ? <span className="text-[8px] font-bold text-emerald-500 bg-emerald-500/10 px-1 rounded">NEW</span>
                          : rankChange > 0 ? <span className="flex items-center text-emerald-500"><TrendingUp className="h-3 w-3" /><span className="text-[9px] font-bold">{rankChange}</span></span>
                          : rankChange < 0 ? <span className="flex items-center text-red-400"><TrendingDown className="h-3 w-3" /><span className="text-[9px] font-bold">{Math.abs(rankChange)}</span></span>
                          : <Minus className="h-3 w-3 text-muted-foreground/20" />}
                      </div>
                      <span className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors truncate flex-1 ml-1">{icon} {tag.name}</span>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <span className="text-[11px] text-muted-foreground tabular-nums">{tag.postCount}p</span>
                        <span className="text-[11px] font-bold tabular-nums text-foreground/60">{tag.score.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
            {current?.tags.length === 0 && <div className="py-6 text-center text-sm text-muted-foreground">Энэ өдөр мэдээлэл алга</div>}
          </div>
        </>
      )}
    </div>
  );
}
