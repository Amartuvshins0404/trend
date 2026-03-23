"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  ThumbsUp, MessageSquare, Share2, ExternalLink,
} from "lucide-react";
import { Header } from "@/components/header";
import { formatDate, formatChartDate } from "@/lib/utils";

interface TopTag {
  id: number;
  name: string;
  category: string | null;
  postCount: number;
  totalReactions: number;
  totalComments: number;
  totalShares: number;
}

interface TimelinePoint {
  date: string;
  postCount: number;
  reactions: number;
  comments: number;
  shares: number;
  sentiment: number | null;
}

interface RecentPost {
  postId: string;
  content: string;
  url: string;
  likes: number;
  comments: number;
  shares: number;
  sentiment: string | null;
  author: string | null;
  group: string | null;
  createdAt: string;
}

interface TagDetail {
  tag: { id: number; name: string; category: string | null };
  timeline: TimelinePoint[];
  recentPosts: RecentPost[];
}

const COLORS = {
  a: { stroke: "#006bd6", fill: "#006bd6" },
  b: { stroke: "#059669", fill: "#059669" },
};

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background"><Header /></div>}>
      <CompareContent />
    </Suspense>
  );
}

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [tags, setTags] = useState<TopTag[]>([]);
  const [loadingTags, setLoadingTags] = useState(true);

  const tagAId = searchParams.get("a") ? Number(searchParams.get("a")) : null;
  const tagBId = searchParams.get("b") ? Number(searchParams.get("b")) : null;

  const [detailA, setDetailA] = useState<TagDetail | null>(null);
  const [detailB, setDetailB] = useState<TagDetail | null>(null);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);

  // Fetch available tags, auto-select top 2 if none chosen
  useEffect(() => {
    setLoadingTags(true);
    fetch("/api/trends/top?limit=30&days=30")
      .then((r) => r.json())
      .then((d) => {
        setTags(d);
        setLoadingTags(false);
        if (!searchParams.get("a") && !searchParams.get("b") && d.length >= 2) {
          router.replace(`/compare?a=${d[0].id}&b=${d[1].id}`);
        }
      })
      .catch(() => setLoadingTags(false));
  }, []);

  // Fetch tag details
  useEffect(() => {
    if (!tagAId) { setDetailA(null); return; }
    setLoadingA(true);
    fetch(`/api/trends/tag/${tagAId}?days=30`)
      .then((r) => r.json())
      .then((d) => { setDetailA(d); setLoadingA(false); })
      .catch(() => setLoadingA(false));
  }, [tagAId]);

  useEffect(() => {
    if (!tagBId) { setDetailB(null); return; }
    setLoadingB(true);
    fetch(`/api/trends/tag/${tagBId}?days=30`)
      .then((r) => r.json())
      .then((d) => { setDetailB(d); setLoadingB(false); })
      .catch(() => setLoadingB(false));
  }, [tagBId]);

  const setTag = useCallback((side: "a" | "b", id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set(side, id);
    else params.delete(side);
    router.push(`/compare?${params}`);
  }, [searchParams, router]);

  // Merge timelines for the chart
  const chartData = (() => {
    const dateMap: Record<string, { date: string; a: number; b: number }> = {};

    if (detailA) {
      for (const p of detailA.timeline) {
        const d = p.date.split("T")[0];
        if (!dateMap[d]) dateMap[d] = { date: d, a: 0, b: 0 };
        dateMap[d].a = p.postCount;
      }
    }
    if (detailB) {
      for (const p of detailB.timeline) {
        const d = p.date.split("T")[0];
        if (!dateMap[d]) dateMap[d] = { date: d, a: 0, b: 0 };
        dateMap[d].b = p.postCount;
      }
    }

    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  })();

  const totalEngagement = (detail: TagDetail | null) => {
    if (!detail) return 0;
    return detail.timeline.reduce((sum, t) => sum + t.reactions + t.comments + t.shares, 0);
  };

  const avgSentiment = (detail: TagDetail | null) => {
    if (!detail) return null;
    const vals = detail.timeline.filter((t) => t.sentiment !== null).map((t) => t.sentiment!);
    if (vals.length === 0) return null;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (avg > 0.3) return "Эерэг";
    if (avg < -0.3) return "Сөрөг";
    return "Дундаж";
  };

  const totalPosts = (detail: TagDetail | null) => {
    if (!detail) return 0;
    return detail.timeline.reduce((sum, t) => sum + t.postCount, 0);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="mb-6 animate-fade-in-up">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Харьцуулах</h1>
          <p className="text-sm text-muted-foreground mt-1">Хоёр сэдвийг зэрэгцүүлэн харах</p>
        </div>

        {/* Tag selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: "40ms" }}>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Сэдэв A</label>
            <select
              value={tagAId ?? ""}
              onChange={(e) => setTag("a", e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-card rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-foreground transition-all"
            >
              <option value="">Сонгох...</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id} disabled={t.id === tagBId}>
                  {t.name} ({t.postCount} пост)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Сэдэв B</label>
            <select
              value={tagBId ?? ""}
              onChange={(e) => setTag("b", e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-card rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1a8b3f]/20 focus:border-[#1a8b3f]/50 text-foreground transition-all"
            >
              <option value="">Сонгох...</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id} disabled={t.id === tagAId}>
                  {t.name} ({t.postCount} пост)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stat cards */}
        {(detailA || detailB) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
            {[
              { detail: detailA, loading: loadingA, color: COLORS.a, label: "A" },
              { detail: detailB, loading: loadingB, color: COLORS.b, label: "B" },
            ].map(({ detail, loading, color, label }) => (
              <div key={label} className="bg-card rounded-lg shadow-sm p-4">
                {loading ? (
                  <div className="h-24 skeleton-shimmer rounded-lg" />
                ) : detail ? (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color.fill }} />
                      <h3 className="text-base font-semibold text-foreground">{detail.tag.name}</h3>
                      {detail.tag.category && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                          {detail.tag.category}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-[11px] text-muted-foreground mb-0.5">Постууд</div>
                        <div className="text-lg font-semibold text-foreground tabular-nums">{totalPosts(detail)}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground mb-0.5">Нийт engagement</div>
                        <div className="text-lg font-semibold text-foreground tabular-nums">{totalEngagement(detail).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground mb-0.5">Хандлага</div>
                        <div className="text-lg font-semibold text-foreground">{avgSentiment(detail) ?? "—"}</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">Сэдэв сонгоно уу</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="bg-card rounded-lg shadow-sm p-4 mb-8 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
            <h3 className="text-sm font-semibold text-foreground mb-4">Өдрийн постууд</h3>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.a.fill} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={COLORS.a.fill} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.b.fill} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={COLORS.b.fill} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  tickFormatter={(v: string) => formatChartDate(v)}
                />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)" }}
                  labelFormatter={(v: string) => formatDate(v)}
                />
                <Legend
                  formatter={(value: string) => {
                    if (value === "a") return detailA?.tag.name ?? "A";
                    if (value === "b") return detailB?.tag.name ?? "B";
                    return value;
                  }}
                  wrapperStyle={{ fontSize: 12 }}
                />
                {detailA && (
                  <Area
                    type="monotone"
                    dataKey="a"
                    name="a"
                    stroke={COLORS.a.stroke}
                    fill="url(#gradA)"
                    strokeWidth={2}
                  />
                )}
                {detailB && (
                  <Area
                    type="monotone"
                    dataKey="b"
                    name="b"
                    stroke={COLORS.b.stroke}
                    fill="url(#gradB)"
                    strokeWidth={2}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent posts side by side */}
        {(detailA || detailB) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up" style={{ animationDelay: "160ms" }}>
            {[
              { detail: detailA, loading: loadingA, color: COLORS.a },
              { detail: detailB, loading: loadingB, color: COLORS.b },
            ].map(({ detail, loading, color }, idx) => (
              <div key={idx}>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color.fill }} />
                  {detail?.tag.name ?? "—"} — Сүүлийн постууд
                </h3>
                {loading ? (
                  <div className="space-y-3">
                    {[0, 1, 2].map((i) => <div key={i} className="h-24 skeleton-shimmer rounded-lg" />)}
                  </div>
                ) : !detail ? (
                  <div className="text-sm text-muted-foreground py-8 text-center">Сэдэв сонгоно уу</div>
                ) : detail.recentPosts.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-8 text-center">Пост олдсонгүй</div>
                ) : (
                  <div className="space-y-3">
                    {detail.recentPosts.slice(0, 10).map((post) => (
                      <a
                        key={post.postId}
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block bg-card rounded-lg shadow-sm p-3 hover:bg-[var(--hover-surface)] transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          {post.author && (
                            <span className="text-[12px] font-semibold text-foreground">{post.author}</span>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {formatDate(post.createdAt)}
                          </span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-[12px] leading-relaxed text-muted-foreground line-clamp-2 mb-2">
                          {post.content}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground tabular-nums">
                          <span className="flex items-center gap-1"><ThumbsUp className="h-2.5 w-2.5" />{post.likes}</span>
                          <span className="flex items-center gap-1"><MessageSquare className="h-2.5 w-2.5" />{post.comments}</span>
                          <span className="flex items-center gap-1"><Share2 className="h-2.5 w-2.5" />{post.shares}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!tagAId && !tagBId && !loadingTags && (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="text-sm text-muted-foreground">Хоёр сэдэв сонгон харьцуулна уу</div>
            <div className="text-xs text-muted-foreground/70 mt-1">Дээрх dropdown-оос сонгоно уу</div>
          </div>
        )}
      </main>
    </div>
  );
}
