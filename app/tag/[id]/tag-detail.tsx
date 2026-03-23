"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie,
} from "recharts";
import {
  forceSimulation, forceLink, forceManyBody, forceCenter,
  forceCollide, forceX, forceY,
  type SimulationNodeDatum, type SimulationLinkDatum,
} from "d3-force";
import {
  ArrowLeft, ThumbsUp, MessageSquare, Share2,
  ExternalLink, Newspaper, TrendingUp, TrendingDown, Activity, Network,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { formatDate, formatChartDate } from "@/lib/utils";

interface TimelinePoint {
  date: string;
  postCount: number;
  newsCount: number;
  score: number;
  reactions: number;
  comments: number;
  shares: number;
  sentiment: number | null;
}

interface PostItem {
  postId: string;
  content: string;
  url: string;
  likes: number;
  comments: number;
  shares: number;
  sentiment: string | null;
  author: string | null;
  group: string | null;
  sourceType?: string;
  createdAt: string;
}

interface NewsItem {
  articleId: string;
  title: string;
  content: string;
  url: string;
  imageUrl: string | null;
  sentiment: string | null;
  source: string | null;
  sourceType?: string;
  publishedDate: string | null;
}

interface TagDetail {
  tag: { id: number; name: string; category: string | null };
  timeline: TimelinePoint[];
  recentPosts: PostItem[];
  recentNews: NewsItem[];
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  topic: { bg: "bg-primary/10", text: "text-primary" },
  entity: { bg: "bg-[#e6f4ea] dark:bg-[#1a8b3f]/20", text: "text-[#1a7431] dark:text-[#4ade80]" },
  location: { bg: "bg-[#f5a623]/10", text: "text-[#c68400] dark:text-[#ffc94d]" },
};

const SENTIMENT_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  positive: { label: "👍 Эерэг", bg: "bg-[#e6f4ea] dark:bg-[#1a8b3f]/25", text: "text-[#1a7431] dark:text-[#4ade80]" },
  neutral: { label: "💬 Дунд", bg: "bg-secondary", text: "text-muted-foreground" },
  negative: { label: "👎 Сөрөг", bg: "bg-[#fce8e6] dark:bg-[#c0392b]/25", text: "text-[#a61d17] dark:text-[#ff6b6b]" },
};

export default function TagDetailClient() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<TagDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<"posts" | "news">("posts");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/trends/tag/${id}?days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.timeline) d.timeline.sort((a: TimelinePoint, b: TimelinePoint) => a.date.localeCompare(b.date));
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, days]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-[1400px] px-6 py-8 space-y-6">
          <div className="h-8 w-64 skeleton-shimmer rounded-lg" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 skeleton-shimmer rounded-lg" />)}
          </div>
          <div className="h-72 skeleton-shimmer rounded-lg" />
        </main>
      </div>
    );
  }

  if (!data || data.tag === undefined) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground text-sm">Сэдэв олдсонгүй</p>
        <Link href="/" className="text-primary hover:underline text-sm font-medium">Нүүр рүү буцах</Link>
      </div>
    );
  }

  const totalPosts = data.timeline.reduce((s, d) => s + d.postCount, 0);
  const totalNews = data.timeline.reduce((s, d) => s + d.newsCount, 0);
  const totalReactions = data.timeline.reduce((s, d) => s + d.reactions, 0);
  const totalComments = data.timeline.reduce((s, d) => s + d.comments, 0);
  const totalShares = data.timeline.reduce((s, d) => s + d.shares, 0);
  const totalScore = data.timeline.reduce((s, d) => s + d.score, 0);

  const sentiments = data.timeline.filter((d) => d.sentiment !== null);
  const avgSentiment = sentiments.length > 0
    ? sentiments.reduce((s, d) => s + (d.sentiment ?? 0), 0) / sentiments.length
    : null;

  const sentimentLabel = avgSentiment === null ? "—" : avgSentiment > 0.2 ? "Эерэг" : avgSentiment < -0.2 ? "Сөрөг" : "Дунд";
  const sentimentColor = avgSentiment === null ? "text-muted-foreground" : avgSentiment > 0.2 ? "text-[#1a8b3f]" : avgSentiment < -0.2 ? "text-[#c0392b]" : "text-muted-foreground";
  const sentimentPct = avgSentiment !== null ? Math.round((avgSentiment + 1) * 50) : 50;

  const cat = CATEGORY_STYLES[data.tag.category || ""] || CATEGORY_STYLES.topic;

  // Engagement breakdown for pie
  const engagementData = [
    { name: "Reactions", value: totalReactions, color: "#3b82f6" },
    { name: "Сэтгэгдэл", value: totalComments, color: "#8b5cf6" },
    { name: "Хуваалцсан", value: totalShares, color: "#f5a623" },
  ].filter(d => d.value > 0);

  // Source breakdown
  const sourceData = [
    { name: "Facebook", value: totalPosts, color: "#3b82f6" },
    { name: "Мэдээ", value: totalNews, color: "#f5a623" },
  ].filter(d => d.value > 0);

  // Timeline bar data for engagement volume
  const engTimelineData = data.timeline.map(d => ({
    date: d.date,
    reactions: d.reactions,
    comments: d.comments,
    shares: d.shares,
    sentiment: d.sentiment,
  }));

  // News sources breakdown
  const newsSourceMap: Record<string, number> = {};
  for (const n of data.recentNews) {
    if (n.source) newsSourceMap[n.source] = (newsSourceMap[n.source] || 0) + 1;
  }
  const newsSourceData = Object.entries(newsSourceMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6 space-y-6">
        {/* Title */}
        <div className="animate-fade-in-up">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mb-3">
            <ArrowLeft className="h-3 w-3" />Буцах
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-foreground">{data.tag.name}</h1>
            {data.tag.category && (
              <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${cat.bg} ${cat.text}`}>{data.tag.category}</span>
            )}
            <span className={`text-sm font-bold ${sentimentColor}`}>{sentimentLabel}</span>
          </div>
        </div>

        {/* Stats + chart — single card */}
        <div className="bg-card rounded-lg shadow-sm animate-fade-in-up" style={{ animationDelay: "60ms" }}>
          {/* Compact stats row inside card */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 pt-4 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-[22px] font-bold text-primary tabular-nums">{totalScore.toFixed(1)}</span>
              <span className="text-[11px] text-muted-foreground">оноо</span>
            </div>
            <div className="flex items-center gap-4 text-[12px]">
              <span className="flex items-center gap-1.5"><MessageSquare className="h-3 w-3 text-primary" /><strong>{totalPosts}</strong> <span className="text-muted-foreground">fb</span></span>
              <span className="flex items-center gap-1.5"><Newspaper className="h-3 w-3 text-[#f5a623]" /><strong>{totalNews}</strong> <span className="text-muted-foreground">мэдээ</span></span>
              <span className="flex items-center gap-1.5"><ThumbsUp className="h-3 w-3 text-muted-foreground" /><strong>{totalReactions}</strong></span>
              <span className="flex items-center gap-1.5"><MessageSquare className="h-3 w-3 text-muted-foreground" /><strong>{totalComments}</strong></span>
              <span className="flex items-center gap-1.5"><Share2 className="h-3 w-3 text-muted-foreground" /><strong>{totalShares}</strong></span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <div className="w-16 h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${sentimentPct}%`, background: `linear-gradient(90deg, #c0392b, #f5a623, #1a8b3f)` }} />
              </div>
              <span className={`text-[11px] font-bold ${sentimentColor}`}>{sentimentLabel}</span>
            </div>
          </div>

          {/* Chart */}
          <div className="px-4 pt-3 pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" />Пост</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f5a623]" />Мэдээ</span>
              </div>
              {newsSourceData.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {newsSourceData.map((s) => (
                    <span key={s.name} className="text-[10px] bg-[#f5a623]/10 text-[#c68400] dark:text-[#ffc94d] px-2 py-0.5 rounded-full">
                      {s.name} ({s.value})
                    </span>
                  ))}
                </div>
              )}
            </div>
            {data.timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={data.timeline} margin={{ left: -10, right: 0, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tl-fb" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1877f2" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#1877f2" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="tl-news" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f5a623" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#f5a623" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tickFormatter={(d) => { try { return formatChartDate(d); } catch { return ""; } }} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px", padding: "10px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", color: "var(--foreground)" }} labelFormatter={(d) => { try { return formatDate(d, "full"); } catch { return ""; } }} formatter={(v: number, name: string) => [v, name === "postCount" ? "Пост" : name === "newsCount" ? "Мэдээ" : name]} />
                  <Area type="monotone" dataKey="postCount" stackId="1" stroke="#1877f2" strokeWidth={2} fill="url(#tl-fb)" dot={false} activeDot={{ r: 4, fill: "#1877f2", stroke: "var(--card)", strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="newsCount" stackId="1" stroke="#f5a623" strokeWidth={1.5} fill="url(#tl-news)" dot={false} activeDot={{ r: 4, fill: "#f5a623", stroke: "var(--card)", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-20 flex items-center justify-center text-sm text-muted-foreground">Өгөгдөл байхгүй</div>
            )}
          </div>
        </div>

        {/* Related tags network bubble */}
        <RelatedNetwork tagId={Number(id)} />

        {/* Posts / News tabs */}
        <div className="animate-fade-in-up" style={{ animationDelay: "240ms" }}>
          <div className="flex items-center gap-1 mb-4">
            <button onClick={() => setTab("posts")} className={`px-4 py-1.5 text-[13px] font-medium rounded-full transition-colors ${tab === "posts" ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary"}`}>
              FB постууд ({data.recentPosts.length})
            </button>
            <button onClick={() => setTab("news")} className={`px-4 py-1.5 text-[13px] font-medium rounded-full transition-colors ${tab === "news" ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary"}`}>
              Мэдээ ({data.recentNews.length})
            </button>
          </div>

          {tab === "posts" && (
            <div className="space-y-2.5">
              {data.recentPosts.map((post, i) => {
                const sent = SENTIMENT_STYLES[post.sentiment || "neutral"] || SENTIMENT_STYLES.neutral;
                return (
                  <a key={post.postId} href={post.url} target="_blank" rel="noopener noreferrer"
                    className="group flex gap-3 bg-card rounded-lg shadow-sm p-3 hover:bg-[var(--hover-surface)] transition-colors animate-fade-in-up"
                    style={{ animationDelay: `${250 + i * 25}ms` }}>
                    <div className="shrink-0 flex flex-col items-center justify-center w-11 rounded-lg bg-primary/5 py-1.5">
                      <ThumbsUp className="h-3 w-3 text-primary mb-0.5" />
                      <span className="text-xs font-bold text-foreground tabular-nums">
                        {post.likes >= 1000 ? `${(post.likes / 1000).toFixed(1)}k` : post.likes}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {post.author && <span className="text-[12px] font-semibold text-foreground/80">{post.author}</span>}
                        {post.group && <span className="text-[11px] text-muted-foreground">{post.group}</span>}
                        <span className="text-[10px] text-muted-foreground ">{formatDate(post.createdAt, "time")}</span>
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${sent.bg} ${sent.text}`}>{sent.label}</span>
                      </div>
                      <p className="text-[13px] text-muted-foreground line-clamp-2 leading-relaxed mb-1.5">{post.content}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground tabular-nums">
                        <span className="flex items-center gap-0.5"><MessageSquare className="h-2.5 w-2.5" />{post.comments}</span>
                        <span className="flex items-center gap-0.5"><Share2 className="h-2.5 w-2.5" />{post.shares}</span>
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary transition-all shrink-0 mt-1" />
                  </a>
                );
              })}
              {data.recentPosts.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">Пост олдсонгүй</div>}
            </div>
          )}

          {tab === "news" && (
            <div className="space-y-2.5">
              {data.recentNews.map((article, i) => {
                const sent = SENTIMENT_STYLES[article.sentiment || "neutral"] || SENTIMENT_STYLES.neutral;
                return (
                  <a key={article.articleId} href={article.url} target="_blank" rel="noopener noreferrer"
                    className="group flex gap-3 bg-card rounded-lg shadow-sm p-3 hover:bg-[var(--hover-surface)] transition-colors animate-fade-in-up"
                    style={{ animationDelay: `${250 + i * 25}ms` }}>
                    <div className="shrink-0 flex flex-col items-center justify-center w-12 rounded-lg bg-[#f5a623]/10 py-1.5">
                      <Newspaper className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {article.source && <span className="text-[12px] font-semibold text-amber-700 dark:text-amber-400">{article.source}</span>}
                        {article.publishedDate && <span className="text-[10px] text-muted-foreground ">{formatDate(article.publishedDate, "time")}</span>}
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${sent.bg} ${sent.text}`}>{sent.label}</span>
                      </div>
                      <p className="text-[13px] font-medium text-foreground/90 line-clamp-1 mb-1">{article.title}</p>
                      <p className="text-[12px] text-muted-foreground line-clamp-1 leading-relaxed">{article.content}</p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-[#f5a623] transition-all shrink-0 mt-1" />
                  </a>
                );
              })}
              {data.recentNews.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">Мэдээ олдсонгүй</div>}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* ── Related Network Bubble Graph ──────────── */
interface BNode extends SimulationNodeDatum {
  id: number; name: string; category: string | null; postCount: number; radius: number; isCurrent: boolean;
}
interface BLink extends SimulationLinkDatum<BNode> { weight: number }

const BCAT: Record<string, string> = { topic: "#1877f2", entity: "#1a8b3f", location: "#f5a623" };

function RelatedNetwork({ tagId }: { tagId: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<BNode[]>([]);
  const linksRef = useRef<BLink[]>([]);
  const simRef = useRef<ReturnType<typeof forceSimulation<BNode>> | null>(null);
  const hoveredRef = useRef<number | null>(null);
  const rafRef = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const [hasData, setHasData] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<{ x: number; y: number; node: BNode } | null>(null);
  const { resolvedTheme } = useTheme();
  const themeRef = useRef(resolvedTheme);
  themeRef.current = resolvedTheme;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    const dpr = window.devicePixelRatio || 1;
    const nodes = nodesRef.current;
    const links = linksRef.current;
    const hov = hoveredRef.current;
    const isDark = themeRef.current === "dark";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);

    // Edges
    for (const link of links) {
      const s = link.source as BNode, t = link.target as BNode;
      if (s.x == null || t.x == null) continue;
      const hi = hov != null && (hov === s.id || hov === t.id);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y!);
      ctx.lineTo(t.x, t.y!);
      ctx.strokeStyle = hi ? (isDark ? "rgba(56,189,248,0.5)" : "rgba(0,112,243,0.4)") : (isDark ? "rgba(56,189,248,0.12)" : "rgba(0,112,243,0.12)");
      ctx.lineWidth = hi ? Math.max(link.weight * 1.5, 2) : Math.max(link.weight, 1);
      ctx.stroke();
    }

    // Nodes
    for (const node of nodes) {
      if (node.x == null) continue;
      const color = BCAT[node.category || ""] || "#64748b";
      const active = hov === node.id || node.isCurrent;
      const r = node.radius;

      // Glow for current/hovered
      if (active) {
        ctx.beginPath();
        ctx.arc(node.x, node.y!, r + 8, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(node.x, node.y!, r, node.x, node.y!, r + 8);
        grad.addColorStop(0, color + "30");
        grad.addColorStop(1, color + "00");
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Circle
      ctx.beginPath();
      ctx.arc(node.x, node.y!, r, 0, Math.PI * 2);
      ctx.fillStyle = node.isCurrent ? color + "40" : color + "15";
      ctx.fill();
      ctx.strokeStyle = active ? color : color + "50";
      ctx.lineWidth = node.isCurrent ? 3 : active ? 2 : 1.5;
      ctx.stroke();

      // Center dot
      ctx.beginPath();
      ctx.arc(node.x, node.y!, Math.max(3, r * 0.3), 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Label
      const fs = Math.max(9, Math.min(13, r * 0.45));
      ctx.font = `${active ? 700 : 500} ${fs}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const text = node.name.length > 18 ? node.name.slice(0, 18) + "…" : node.name;
      const tw = ctx.measureText(text).width;
      const tx = node.x, ty = node.y! + r + 5;
      ctx.fillStyle = isDark ? "rgba(15,23,42,0.9)" : "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.roundRect(tx - tw / 2 - 4, ty - 1, tw + 8, fs + 4, 3);
      ctx.fill();
      ctx.fillStyle = isDark ? (active ? "#e4e6eb" : "#8a8d91") : (active ? "#1c1e21" : "#8a8d91");
      ctx.fillText(text, tx, ty + 1);
    }

    ctx.restore();
  }, []);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  }, [resolvedTheme, draw]);

  useEffect(() => {
    fetch("/api/trends/co-occurrence?days=30&min_count=1")
      .then(r => r.json())
      .then(rawData => {
        if (!rawData.nodes?.length || !containerRef.current || !canvasRef.current) return;

        // Find edges connected to this tag
        const connectedEdges = rawData.edges.filter((e: { source: number; target: number }) => e.source === tagId || e.target === tagId);
        const connectedIds = new Set<number>([tagId]);
        for (const e of connectedEdges) { connectedIds.add(e.source); connectedIds.add(e.target); }

        // Also get 2nd degree connections for richer graph
        const secondEdges = rawData.edges.filter((e: { source: number; target: number }) =>
          connectedIds.has(e.source) || connectedIds.has(e.target)
        );
        for (const e of secondEdges) { connectedIds.add(e.source); connectedIds.add(e.target); }

        const relevantNodes = rawData.nodes.filter((n: { id: number }) => connectedIds.has(n.id));
        const relevantEdges = rawData.edges.filter((e: { source: number; target: number }) =>
          connectedIds.has(e.source) && connectedIds.has(e.target)
        );

        if (relevantNodes.length < 2) return;

        const canvas = canvasRef.current!;
        const container = containerRef.current!;
        const w = container.clientWidth;
        const h = 360;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        sizeRef.current = { w, h };

        const maxP = Math.max(...relevantNodes.map((n: { postCount: number }) => n.postCount), 1);
        const nodes: BNode[] = relevantNodes.map((n: { id: number; name: string; category: string | null; postCount: number }) => ({
          ...n,
          radius: n.id === tagId ? 28 : 8 + (n.postCount / maxP) * 22,
          isCurrent: n.id === tagId,
        }));
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        const links: BLink[] = relevantEdges
          .filter((e: { source: number; target: number }) => nodeMap.has(e.source) && nodeMap.has(e.target))
          .map((e: { source: number; target: number; weight: number }) => ({
            source: nodeMap.get(e.source)!,
            target: nodeMap.get(e.target)!,
            weight: e.weight,
          }));

        nodesRef.current = nodes;
        linksRef.current = links;
        setHasData(true);

        if (simRef.current) simRef.current.stop();
        const sim = forceSimulation<BNode>(nodes)
          .force("link", forceLink<BNode, BLink>(links).id(d => d.id).distance(80).strength(0.3))
          .force("charge", forceManyBody().strength(-200))
          .force("center", forceCenter(0, 0))
          .force("x", forceX(0).strength(0.05))
          .force("y", forceY(0).strength(0.05))
          .force("collide", forceCollide<BNode>().radius(d => d.radius + 6).strength(0.8))
          .alphaDecay(0.025)
          .on("tick", () => {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(draw);
          });
        simRef.current = sim;
      })
      .catch(() => {});

    return () => { simRef.current?.stop(); cancelAnimationFrame(rafRef.current); };
  }, [tagId, draw]);

  const findNode = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left - sizeRef.current.w / 2;
    const my = e.clientY - rect.top - sizeRef.current.h / 2;
    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const n = nodesRef.current[i];
      if (n.x == null) continue;
      const dx = mx - n.x, dy = my - n.y!;
      if (dx * dx + dy * dy < (n.radius + 4) ** 2) return n;
    }
    return null;
  };

  if (!hasData) return null;

  return (
    <div className="bg-card rounded-lg shadow-sm p-4 animate-fade-in-up" style={{ animationDelay: "180ms" }}>
      <h2 className="text-[15px] font-semibold text-foreground mb-3 flex items-center gap-2">
        <Network className="h-4 w-4 text-primary" />Холбоотой сэдвүүд
      </h2>
      <div ref={containerRef} className="relative" style={{ height: 360 }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full rounded-lg"
          onMouseMove={(e) => {
            const node = findNode(e);
            const prev = hoveredRef.current;
            hoveredRef.current = node?.id ?? null;
            if (node) {
              const rect = canvasRef.current!.getBoundingClientRect();
              setHoveredNode({ x: e.clientX - rect.left, y: e.clientY - rect.top, node });
            } else {
              setHoveredNode(null);
            }
            if (prev !== hoveredRef.current) {
              cancelAnimationFrame(rafRef.current);
              rafRef.current = requestAnimationFrame(draw);
            }
            canvasRef.current!.style.cursor = node ? "pointer" : "default";
          }}
          onMouseLeave={() => {
            hoveredRef.current = null;
            setHoveredNode(null);
            cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(draw);
          }}
          onClick={(e) => {
            const node = findNode(e);
            if (node && !node.isCurrent) {
              window.location.href = `/tag/${node.id}`;
            }
          }}
        />
        {hoveredNode && (
          <div className="absolute pointer-events-none" style={{ left: hoveredNode.x + 14, top: hoveredNode.y - 10, transform: "translateY(-100%)" }}>
            <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
              <div className="text-[12px] font-semibold text-foreground">{hoveredNode.node.name}</div>
              <div className="text-[10px] text-muted-foreground">{hoveredNode.node.postCount} пост</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, highlight }: { label: string; value: number | string; icon?: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-lg shadow-sm p-3.5 ${highlight ? "bg-primary text-white" : "bg-card"}`}>
      <div className="flex items-center justify-between mb-0.5">
        <span className={`text-[12px] text-muted-foreground ${highlight ? "!text-white/70" : ""}`}>{label}</span>
        {icon && <span className={highlight ? "text-blue-200" : "text-muted-foreground"}>{icon}</span>}
      </div>
      <div className={`text-lg font-bold tabular-nums ${highlight ? "text-white" : "text-foreground"}`}>{typeof value === "number" ? value.toLocaleString() : value}</div>
    </div>
  );
}
