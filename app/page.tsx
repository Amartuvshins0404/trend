"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip,
  BarChart, Bar, Cell,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, Hash, MessageSquare,
  Search, ArrowUpRight, Flame, ThumbsUp, Share2,
  BarChart3, ExternalLink, Zap, Eye, Activity,
  Newspaper, Globe, Play, Pause, ChevronLeft, ChevronRight, Clock,
} from "lucide-react";
import { Header } from "@/components/header";

interface TagTrend {
  id: number;
  name: string;
  category: string | null;
  postCount: number;
  newsCount: number;
  score: number;
  totalReactions: number;
  totalComments: number;
  totalShares: number;
  trend: "rising" | "falling" | "stable";
  dailyData: { date: string; postCount: number; newsCount: number; score: number; reactions: number; sentiment: number | null }[];
}

interface Overview {
  totalPosts: number;
  totalNews: number;
  totalTags: number;
  newsSources: number;
  postsThisWeek: number;
  postsLastWeek: number;
  weekOverWeekChange: number;
  taggedPosts: number;
  untaggedPosts: number;
  lastUpdated: string | null;
}

interface Post {
  postId: string;
  content: string;
  url: string;
  likes: number;
  commentCount: number;
  shareCount: number;
  author: string | null;
  tags: { name: string; category: string | null; sentiment: string | null }[];
  createdAt: string;
}

interface TimelineTag {
  id: number;
  name: string;
  category: string | null;
  score: number;
  postCount: number;
  newsCount: number;
  velocity: number | null;
  sentiment: number | null;
  reactions: number;
  rank: number;
}

interface DaySnapshot {
  date: string;
  tags: TimelineTag[];
  totalTags: number;
}

/* Facebook-native tag category styles — filled pills, no borders */
const CAT: Record<string, { dot: string; pill: string; label: string }> = {
  topic: { dot: "bg-primary", pill: "bg-primary/10 text-primary font-medium", label: "сэдэв" },
  entity: { dot: "bg-[#31a24c]", pill: "bg-[#e6f4ea] dark:bg-[#1a8b3f]/20 text-[#1a7431] dark:text-[#4ade80] font-medium", label: "нэр" },
  location: { dot: "bg-[#f5a623]", pill: "bg-[#f5a623]/10 text-[#c68400] dark:text-[#ffc94d] font-medium", label: "газар" },
};

const SENTIMENT_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  positive: { bg: "bg-[#e6f4ea] dark:bg-[#1a8b3f]/25", text: "text-[#1a7431] dark:text-[#4ade80]", label: "👍 Эерэг" },
  negative: { bg: "bg-[#fce8e6] dark:bg-[#c0392b]/25", text: "text-[#a61d17] dark:text-[#ff6b6b]", label: "👎 Сөрөг" },
  neutral: { bg: "bg-secondary", text: "text-muted-foreground", label: "💬 Дунд" },
};

export default function Home() {
  const [trends, setTrends] = useState<TagTrend[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [hotPosts, setHotPosts] = useState<Post[]>([]);
  const days = 7;
  const [loading, setLoading] = useState(true);
  const [tagFilter, setTagFilter] = useState("");
  const [searchResults, setSearchResults] = useState<TagTrend[] | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timeline state
  const [tlSnapshots, setTlSnapshots] = useState<DaySnapshot[]>([]);
  const [tlIndex, setTlIndex] = useState(0);
  const [tlPlaying, setTlPlaying] = useState(false);
  const tlInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/trends/top?days=${days}&limit=30&category=topic`).then((r) => r.json()),
      fetch("/api/trends/overview").then((r) => r.json()),
      fetch(`/api/posts/?days=${days}&limit=50&tagged=true`).then((r) => r.json()).then((d) => d.posts || d),
      fetch(`/api/trends/timeline?days=${days}&limit=10&category=topic`).then((r) => r.json()),
    ])
      .then(([trendsData, overviewData, postsData, timelineData]) => {
        for (const t of trendsData) {
          t.dailyData.sort((a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date));
        }
        setTrends(trendsData);
        setOverview(overviewData);
        const sorted = (postsData as Post[])
          .filter((p: Post) => p.tags.length > 0 && p.content.length > 30)
          .sort((a: Post, b: Post) => (b.likes + b.commentCount + b.shareCount) - (a.likes + a.commentCount + a.shareCount));
        setHotPosts(sorted.slice(0, 8));
        setTlSnapshots(timelineData);
        setTlIndex(timelineData.length - 1);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [days]);

  // Timeline auto-play
  useEffect(() => {
    if (tlPlaying && tlSnapshots.length > 0) {
      tlInterval.current = setInterval(() => {
        setTlIndex((prev) => {
          if (prev >= tlSnapshots.length - 1) {
            setTlPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
    }
    return () => { if (tlInterval.current) clearInterval(tlInterval.current); };
  }, [tlPlaying, tlSnapshots.length]);

  const tlPlay = useCallback(() => {
    if (tlIndex >= tlSnapshots.length - 1) setTlIndex(0);
    setTlPlaying(true);
  }, [tlIndex, tlSnapshots.length]);

  // Local filter for loaded trends, API search for deeper queries
  const filtered = searchResults !== null
    ? searchResults
    : trends.filter((t) => t.name.toLowerCase().includes(tagFilter.toLowerCase()));

  const handleSearch = useCallback((query: string) => {
    setTagFilter(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!query.trim() || query.length < 2) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    // If local trends already match, don't hit API
    const localMatches = trends.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()));
    if (localMatches.length > 0) {
      setSearchResults(null);
      return;
    }
    // Debounce API search
    setSearching(true);
    searchTimeout.current = setTimeout(() => {
      fetch(`/api/trends/search?q=${encodeURIComponent(query)}&limit=20`)
        .then((r) => r.json())
        .then((data) => {
          // Map to TagTrend shape for the sidebar
          setSearchResults(data.map((t: { id: number; name: string; category: string | null; score: number; postCount: number; newsCount: number }) => ({
            ...t, totalReactions: 0, totalComments: 0, totalShares: 0, trend: "stable" as const, dailyData: [],
          })));
          setSearching(false);
        })
        .catch(() => { setSearchResults(null); setSearching(false); });
    }, 300);
  }, [trends]);

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
                setCurrentIndex={(i) => { setTlPlaying(false); setTlIndex(i); }}
                playing={tlPlaying}
                onPlay={tlPlay}
                onPause={() => setTlPlaying(false)}
              />
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
                    value={tagFilter}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-[14px] bg-secondary rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="px-2 pb-2 flex-1 overflow-y-auto custom-scrollbar">
                {filtered.map((t, i) => {
                  const cat = CAT[t.category || ""] || CAT.topic;
                  const sentVals = t.dailyData.filter(d => d.sentiment !== null);
                  const avg = sentVals.length > 0 ? sentVals.reduce((s, d) => s + (d.sentiment ?? 0), 0) / sentVals.length : 0;
                  const changeColor = avg > 0.2 ? "text-[#1a8b3f]" : avg < -0.2 ? "text-[#c0392b]" : "text-muted-foreground/50";

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
  const color = sentiment > 0.2 ? "#1a8b3f" : sentiment < -0.2 ? "#c0392b" : "#8b8d91";
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

/* ── Rank Badge ─── */
function RankBadge({ rank }: { rank: number }) {
  return <span className="text-[12px] text-muted-foreground w-5 text-center tabular-nums">{rank + 1}</span>;
}

/* ── Hot Topic Card — Facebook content container style ─── */
function HotCard({ tag, rank }: { tag: TagTrend; rank: number }) {
  const cat = CAT[tag.category || ""] || CAT.topic;
  const spark = tag.dailyData.map((d) => ({ v: d.postCount }));
  const total = tag.totalReactions + tag.totalComments + tag.totalShares;

  const sentVals = tag.dailyData.filter((d) => d.sentiment !== null);
  const avg = sentVals.length > 0 ? sentVals.reduce((s, d) => s + (d.sentiment ?? 0), 0) / sentVals.length : null;
  const sentLabel = avg === null ? null : avg > 0.2 ? "👍 Эерэг" : avg < -0.2 ? "👎 Сөрөг" : "Дунд";
  const sentCls = avg === null ? "" : avg > 0.2 ? "text-[#1a7431] dark:text-[#4ade80] bg-[#e6f4ea] dark:bg-[#1a8b3f]/25" : avg < -0.2 ? "text-[#a61d17] dark:text-[#ff6b6b] bg-[#fce8e6] dark:bg-[#c0392b]/25" : "text-muted-foreground bg-secondary";
  const sparkColor = avg !== null && avg > 0.2 ? "#1a8b3f" : avg !== null && avg < -0.2 ? "#c0392b" : "#8b8d91";

  return (
    <Link
      href={`/tag/${tag.id}`}
      className="group bg-card rounded-lg shadow-sm p-4 hover:bg-[var(--hover-surface)] transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <RankBadge rank={rank} />
        <div className="flex items-center gap-1">
          {tag.category && <span className={`text-[10px] px-2 py-0.5 rounded-full ${cat.pill}`}>{cat.label}</span>}
          {sentLabel && <span className={`text-[10px] px-2 py-0.5 rounded-full ${sentCls}`}>{sentLabel}</span>}
        </div>
      </div>

      <h3 className="text-[15px] font-semibold text-foreground group-hover:text-primary transition-colors leading-snug mb-2">
        {tag.name}
      </h3>

      {spark.length > 1 && (
        <div className="h-10 mb-2 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark}>
              <defs>
                <linearGradient id={`sp-${tag.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparkColor} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={sparkColor} strokeWidth={1.5} fill={`url(#sp-${tag.id})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1 tabular-nums"><MessageSquare className="h-3 w-3" />{tag.postCount}</span>
          {tag.newsCount > 0 && <span className="flex items-center gap-1 tabular-nums text-[#f5a623]"><Newspaper className="h-3 w-3" />{tag.newsCount}</span>}
          <span className="flex items-center gap-1 tabular-nums"><ThumbsUp className="h-3 w-3" />{total.toLocaleString()}</span>
        </div>
        <span className="text-[12px] font-bold tabular-nums text-foreground/60">{tag.score.toFixed(1)}</span>
      </div>
    </Link>
  );
}

/* ── Post Card — Facebook feed item feel ─── */
function PostCard({ post, delay }: { post: Post; delay: number }) {
  const sentiments = post.tags.map((t) => t.sentiment).filter(Boolean);
  const dominant = sentiments.length > 0 ? sentiments[0] : "neutral";
  const sent = SENTIMENT_STYLE[dominant || "neutral"] || SENTIMENT_STYLE.neutral;

  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 bg-card rounded-lg shadow-sm p-3 sm:p-4 hover:bg-[var(--hover-surface)] transition-colors animate-fade-in-up"
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
            const tc = CAT[tag.category || ""] || CAT.topic;
            return (
              <span key={tag.name} className={`text-[10px] px-2 py-0.5 rounded-full ${tc.pill} truncate max-w-[120px] sm:max-w-none`}>{tag.name}</span>
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

/* ── Timeline Section ─── */
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
  const current = snapshots[currentIndex];
  const prev = currentIndex > 0 ? snapshots[currentIndex - 1] : null;
  const prevRankMap = new Map<number, number>();
  if (prev) {
    for (const t of prev.tags) prevRankMap.set(t.id, t.rank);
  }

  return (
    <div className="bg-card rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <SectionLabel icon={<Clock className="h-4 w-4 text-primary" />} title="Тойм мэдээ" />
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex <= 0}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-secondary hover:bg-border disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => playing ? onPause() : onPlay()}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
          </button>
          <button
            onClick={() => setCurrentIndex(Math.min(snapshots.length - 1, currentIndex + 1))}
            disabled={currentIndex >= snapshots.length - 1}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-secondary hover:bg-border disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Day selector */}
      <div className="flex gap-1 mb-3">
        {snapshots.map((snap, i) => {
          const isActive = i === currentIndex;
          const isPast = i < currentIndex;
          return (
            <button
              key={snap.date}
              onClick={() => setCurrentIndex(i)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-md transition-all text-center ${
                isActive
                  ? "bg-primary/15 ring-1 ring-primary/30"
                  : isPast
                  ? "bg-primary/5 hover:bg-primary/10"
                  : "hover:bg-secondary"
              }`}
            >
              <span className={`text-[10px] ${isActive ? "text-primary font-bold" : "text-muted-foreground"}`}>
                {["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"][new Date(snap.date + "T00:00:00Z").getUTCDay()]}
              </span>
              <span className={`text-[13px] font-semibold tabular-nums ${isActive ? "text-primary" : "text-foreground/70"}`}>
                {new Date(snap.date + "T00:00:00Z").getUTCDate()}
              </span>
              <div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-primary" : isPast ? "bg-primary/30" : "bg-border"}`} />
            </button>
          );
        })}
      </div>

      {/* Ranked list */}
      <div className="space-y-1">
        {current?.tags.map((tag) => {
          const prevRank = prevRankMap.get(tag.id);
          const isNew = prev && prevRank === undefined;
          const rankChange = prevRank !== undefined ? prevRank - tag.rank : 0;
          const maxScore = current.tags[0]?.score || 1;
          const pct = (tag.score / maxScore) * 100;

          const sent = tag.sentiment ?? 0;
          const isPositive = sent > 0.2;
          const isNegative = sent < -0.2;
          const barFill = isPositive
            ? "bg-[#e6f4ea] dark:bg-[#1a8b3f]/25"
            : isNegative
            ? "bg-[#fce8e6] dark:bg-[#c0392b]/25"
            : "bg-[#8b8d91]/10 dark:bg-[#8b8d91]/15";
          const sentIcon = isPositive ? "👍" : isNegative ? "👎" : "💬";

          return (
            <Link key={tag.id} href={`/tag/${tag.id}`} className="group block">
              <div className="relative flex items-center h-9 rounded-md overflow-hidden">
                <div
                  className={`absolute left-0 top-0 bottom-0 ${barFill} transition-all duration-500 ease-out`}
                  style={{ width: `${pct}%` }}
                />
                <div className="relative z-10 flex items-center w-full px-2.5">
                  <span className={`text-[12px] font-bold tabular-nums w-5 text-center ${
                    tag.rank <= 3 ? "text-primary" : "text-muted-foreground"
                  }`}>{tag.rank}</span>

                  <div className="w-6 flex items-center justify-center ml-1">
                    {isNew ? (
                      <span className="text-[8px] font-bold text-emerald-500 bg-emerald-500/10 px-1 rounded">NEW</span>
                    ) : rankChange > 0 ? (
                      <span className="flex items-center text-emerald-500">
                        <TrendingUp className="h-3 w-3" />
                        <span className="text-[9px] font-bold">{rankChange}</span>
                      </span>
                    ) : rankChange < 0 ? (
                      <span className="flex items-center text-red-400">
                        <TrendingDown className="h-3 w-3" />
                        <span className="text-[9px] font-bold">{Math.abs(rankChange)}</span>
                      </span>
                    ) : (
                      <Minus className="h-3 w-3 text-muted-foreground/20" />
                    )}
                  </div>

                  <span className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors truncate flex-1 ml-1">
                    {sentIcon} {tag.name}
                  </span>

                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <span className="text-[11px] text-muted-foreground tabular-nums">{tag.postCount}p</span>
                    <span className="text-[11px] font-bold tabular-nums text-foreground/60">{tag.score.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
        {current?.tags.length === 0 && (
          <div className="py-6 text-center text-sm text-muted-foreground">Энэ өдөр мэдээлэл алга</div>
        )}
      </div>
    </div>
  );
}
