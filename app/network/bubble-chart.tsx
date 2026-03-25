"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  forceSimulation, forceLink, forceManyBody, forceCenter,
  forceCollide, forceX, forceY,
  type SimulationNodeDatum, type SimulationLinkDatum,
} from "d3-force";
import { useTheme } from "@/components/theme-provider";
import { getSentimentKey, getSentimentColor, SENTIMENT_STYLES } from "@/lib/constants";
import { MessageSquare, Newspaper } from "lucide-react";

interface BNode extends SimulationNodeDatum {
  id: number;
  name: string;
  category: string | null;
  postCount: number;
  newsCount: number;
  sentiment: number;
  r: number;
}

interface BLink extends SimulationLinkDatum<BNode> {
  weight: number;
}

interface ApiData {
  nodes: { id: number; name: string; category: string | null; postCount: number }[];
  edges: { source: number; target: number; weight: number }[];
}

export default function BubbleChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<BNode[]>([]);
  const linksRef = useRef<BLink[]>([]);
  const simRef = useRef<ReturnType<typeof forceSimulation<BNode>> | null>(null);
  const hoveredRef = useRef<number | null>(null);
  const dragRef = useRef<{ node: BNode | null; offsetX: number; offsetY: number }>({ node: null, offsetX: 0, offsetY: 0 });
  const panRef = useRef({ active: false, startX: 0, startY: 0, origX: 0, origY: 0 });
  const viewRef = useRef({ x: 0, y: 0, scale: 1 });
  const rafRef = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<BNode | null>(null);
  const [hoveredPos, setHoveredPos] = useState<{ x: number; y: number } | null>(null);
  const { resolvedTheme } = useTheme();
  const themeRef = useRef(resolvedTheme);
  themeRef.current = resolvedTheme;
  const router = useRouter();

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
    const view = viewRef.current;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(view.x + w / 2, view.y + h / 2);
    ctx.scale(view.scale, view.scale);

    // Active node = hovered or dragged
    const dragNode = dragRef.current.node;
    const activeId = dragNode?.id ?? hov;

    // Build connected set for active node
    const connectedIds = new Set<number>();
    if (activeId !== null) {
      connectedIds.add(activeId);
      for (const link of links) {
        const s = link.source as BNode;
        const t = link.target as BNode;
        if (s.id === activeId) connectedIds.add(t.id);
        if (t.id === activeId) connectedIds.add(s.id);
      }
    }

    // Lines BEHIND bubbles — draw first
    for (const link of links) {
      const s = link.source as BNode;
      const t = link.target as BNode;
      if (s.x == null || t.x == null) continue;
      const isHighlighted = activeId !== null && (activeId === s.id || activeId === t.id);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y!);
      ctx.lineTo(t.x, t.y!);
      ctx.strokeStyle = isHighlighted
        ? (isDark ? "rgba(96,165,250,0.5)" : "rgba(59,130,246,0.4)")
        : (isDark ? "rgba(96,165,250,0.08)" : "rgba(59,130,246,0.06)");
      ctx.lineWidth = isHighlighted ? 2.5 : 0.8;
      ctx.stroke();
    }

    // Bubbles ON TOP
    for (const node of nodes) {
      if (node.x == null) continue;
      const isActive = node.id === activeId;
      const isConnected = connectedIds.has(node.id);
      const dimmed = activeId !== null && !isActive && !isConnected;
      const highlighted = isActive || isConnected;
      const r = node.r;

      // Sentiment color
      let fill: string, border: string;
      const sentKey = getSentimentKey(node.sentiment);
      if (dimmed) {
        fill = isDark ? "rgba(30,41,59,0.25)" : "rgba(241,245,249,0.4)";
        border = "transparent";
      } else if (sentKey === "positive") {
        fill = isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.1)";
        border = highlighted ? (isDark ? "rgba(52,211,153,0.7)" : "rgba(16,185,129,0.5)") : (isDark ? "rgba(52,211,153,0.3)" : "rgba(16,185,129,0.2)");
      } else if (sentKey === "negative") {
        fill = isDark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.1)";
        border = highlighted ? (isDark ? "rgba(248,113,113,0.7)" : "rgba(239,68,68,0.5)") : (isDark ? "rgba(248,113,113,0.3)" : "rgba(239,68,68,0.2)");
      } else {
        fill = isDark ? "rgba(51,65,85,0.6)" : "rgba(226,232,240,0.85)";
        border = highlighted ? (isDark ? "rgba(148,163,184,0.6)" : "rgba(100,116,139,0.4)") : (isDark ? "rgba(100,116,139,0.25)" : "rgba(148,163,184,0.25)");
      }

      // Circle
      ctx.beginPath();
      ctx.arc(node.x, node.y!, r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = border;
      ctx.lineWidth = highlighted ? 2.5 : 1;
      ctx.stroke();

      if (dimmed) continue;

      // Name inside
      const maxChars = Math.max(4, Math.floor(r / 4));
      const name = node.name.length > maxChars ? node.name.slice(0, maxChars) + "…" : node.name;
      const nameFs = Math.max(8, Math.min(12, r * 0.28));
      ctx.font = `500 ${nameFs}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = isDark ? "rgba(226,232,240,0.85)" : "rgba(15,23,42,0.8)";
      ctx.fillText(name, node.x, node.y! - nameFs * 0.3);

      // Post count
      const countFs = Math.max(7, nameFs * 0.7);
      ctx.font = `600 ${countFs}px system-ui, sans-serif`;
      ctx.fillStyle = isDark ? "rgba(148,163,184,0.5)" : "rgba(100,116,139,0.45)";
      ctx.fillText(String(node.postCount), node.x, node.y! + nameFs * 0.45);
    }

    ctx.restore();
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/trends/co-occurrence?days=30&min_count=1").then(r => r.json()),
      fetch("/api/trends/top?days=14&limit=80&category=topic").then(r => r.json()),
    ]).then(([coData, topData]: [ApiData, any[]]) => {
      if (!containerRef.current || !canvasRef.current || !coData.nodes?.length) {
        setLoading(false); return;
      }

      const sentMap = new Map<number, { sentiment: number; newsCount: number }>();
      for (const t of topData) {
        const sv = (t.dailyData || []).filter((d: any) => d.sentiment !== null);
        const avg = sv.length ? sv.reduce((s: number, d: any) => s + d.sentiment, 0) / sv.length : 0;
        sentMap.set(t.id, { sentiment: avg, newsCount: t.newsCount || 0 });
      }

      const tagNodes = coData.nodes.filter((n: any) => n.id > 0)
        .sort((a: any, b: any) => b.postCount - a.postCount).slice(0, 80);
      const tagIds = new Set(tagNodes.map((n: any) => n.id));

      const canvas = canvasRef.current!;
      const container = containerRef.current!;
      const w = container.clientWidth;
      const h = container.clientHeight || (window.innerHeight - 130);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      sizeRef.current = { w, h };

      const maxPost = Math.max(...tagNodes.map((n: any) => n.postCount), 1);
      const minR = 18;
      const maxR = Math.min(w, h) * 0.055;

      const nodes: BNode[] = tagNodes.map((n: any) => {
        const info = sentMap.get(n.id);
        return {
          id: n.id, name: n.name, category: n.category, postCount: n.postCount,
          newsCount: info?.newsCount || 0, sentiment: info?.sentiment || 0,
          r: minR + Math.sqrt(n.postCount / maxPost) * (maxR - minR),
        };
      });

      const nodeMap = new Map(nodes.map(n => [n.id, n]));
      const links: BLink[] = [];
      for (const e of coData.edges) {
        if (nodeMap.has(e.source) && nodeMap.has(e.target)) {
          links.push({ source: nodeMap.get(e.source)!, target: nodeMap.get(e.target)!, weight: e.weight });
        }
      }

      nodesRef.current = nodes;
      linksRef.current = links;

      // D3 force simulation
      if (simRef.current) simRef.current.stop();
      const sim = forceSimulation<BNode>(nodes)
        .force("link", forceLink<BNode, BLink>(links).id(d => d.id).distance(100).strength(0.15))
        .force("charge", forceManyBody().strength(-120))
        .force("center", forceCenter(0, 0).strength(0.05))
        .force("x", forceX(0).strength(0.02))
        .force("y", forceY(0).strength(0.02))
        .force("collide", forceCollide<BNode>().radius(d => d.r + 6).strength(0.8))
        .alphaDecay(0.02)
        .on("tick", () => {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(draw);
        });

      simRef.current = sim;

      // Auto-fit after settling
      setTimeout(() => {
        let bMinX = Infinity, bMaxX = -Infinity, bMinY = Infinity, bMaxY = -Infinity;
        for (const n of nodes) {
          if (n.x == null) continue;
          bMinX = Math.min(bMinX, n.x - n.r); bMaxX = Math.max(bMaxX, n.x + n.r);
          bMinY = Math.min(bMinY, n.y! - n.r); bMaxY = Math.max(bMaxY, n.y! + n.r);
        }
        const cw = bMaxX - bMinX + 80;
        const ch = bMaxY - bMinY + 80;
        viewRef.current.scale = Math.min(w / cw, h / ch, 1.5);
      }, 3000);

      setLoading(false);
    }).catch(() => setLoading(false));

    return () => { simRef.current?.stop(); cancelAnimationFrame(rafRef.current); };
  }, [draw]);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const { w, h } = sizeRef.current;
    const { x: vx, y: vy, scale } = viewRef.current;
    return { x: (sx - w / 2 - vx) / scale, y: (sy - h / 2 - vy) / scale };
  }, []);

  const findNode = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const { x: wx, y: wy } = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const n = nodesRef.current[i];
      if (n.x == null) continue;
      const dx = wx - n.x, dy = wy - n.y!;
      if (dx * dx + dy * dy < (n.r + 4) ** 2) return n;
    }
    return null;
  }, [screenToWorld]);

  return (
    <div>
      <div ref={containerRef} className="relative bg-card rounded-xl shadow-sm overflow-hidden"
        style={{ height: "calc(100vh - 120px)" }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-card/80">
            <div className="text-sm text-muted-foreground">Ачаалж байна...</div>
          </div>
        )}
        <canvas ref={canvasRef} className="w-full h-full"
          style={{ cursor: dragRef.current.node ? "grabbing" : panRef.current.active ? "grabbing" : "grab" }}
          onMouseDown={(e) => {
            const node = findNode(e);
            if (node) {
              // Drag node
              const rect = canvasRef.current!.getBoundingClientRect();
              const { x: wx, y: wy } = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
              dragRef.current = { node, offsetX: wx - (node.x || 0), offsetY: wy - (node.y || 0) };
              node.fx = node.x;
              node.fy = node.y;
              simRef.current?.alphaTarget(0.3).restart();
            } else {
              // Pan
              panRef.current = { active: true, startX: e.clientX, startY: e.clientY,
                origX: viewRef.current.x, origY: viewRef.current.y };
            }
          }}
          onMouseMove={(e) => {
            if (dragRef.current.node) {
              const rect = canvasRef.current!.getBoundingClientRect();
              const { x: wx, y: wy } = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
              dragRef.current.node.fx = wx - dragRef.current.offsetX;
              dragRef.current.node.fy = wy - dragRef.current.offsetY;
              canvasRef.current!.style.cursor = "grabbing";
              return;
            }
            if (panRef.current.active) {
              viewRef.current.x = panRef.current.origX + (e.clientX - panRef.current.startX);
              viewRef.current.y = panRef.current.origY + (e.clientY - panRef.current.startY);
              cancelAnimationFrame(rafRef.current);
              rafRef.current = requestAnimationFrame(draw);
              canvasRef.current!.style.cursor = "grabbing";
              return;
            }
            const node = findNode(e);
            const prev = hoveredRef.current;
            hoveredRef.current = node?.id ?? null;
            if (prev !== hoveredRef.current) {
              setHovered(node || null);
              if (node) {
                const rect = canvasRef.current!.getBoundingClientRect();
                setHoveredPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
              } else { setHoveredPos(null); }
              cancelAnimationFrame(rafRef.current);
              rafRef.current = requestAnimationFrame(draw);
            }
            canvasRef.current!.style.cursor = node ? "pointer" : "grab";
          }}
          onMouseUp={(e) => {
            if (dragRef.current.node) {
              dragRef.current.node.fx = null;
              dragRef.current.node.fy = null;
              dragRef.current = { node: null, offsetX: 0, offsetY: 0 };
              simRef.current?.alphaTarget(0);
            }
            if (panRef.current.active) {
              const moved = Math.abs(e.clientX - panRef.current.startX) + Math.abs(e.clientY - panRef.current.startY);
              panRef.current.active = false;
              if (moved < 5) {
                const node = findNode(e);
                if (node) router.push(`/tag/${node.id}`);
              }
            }
            canvasRef.current!.style.cursor = "grab";
          }}
          onMouseLeave={() => {
            if (dragRef.current.node) {
              dragRef.current.node.fx = null;
              dragRef.current.node.fy = null;
              dragRef.current = { node: null, offsetX: 0, offsetY: 0 };
              simRef.current?.alphaTarget(0);
            }
            panRef.current.active = false;
            hoveredRef.current = null;
            setHovered(null);
            setHoveredPos(null);
            cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(draw);
          }}
          onWheel={(e) => {
            e.preventDefault();
            viewRef.current.scale = Math.max(0.3, Math.min(3, viewRef.current.scale * (e.deltaY > 0 ? 0.92 : 1.08)));
            cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(draw);
          }}
        />

        {hovered && hoveredPos && (
          <div className="absolute z-20 pointer-events-none" style={{
            left: Math.min(hoveredPos.x + 16, sizeRef.current.w - 220),
            top: Math.max(hoveredPos.y - 80, 8),
          }}>
            <div className="bg-card border border-border rounded-lg px-4 py-3 shadow-lg min-w-[180px]">
              <div className="text-[14px] font-semibold text-foreground mb-2">{hovered.name}</div>
              <div className="space-y-1.5 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1"><MessageSquare className="h-3 w-3" /> FB</span>
                  <span className="font-semibold">{hovered.postCount}</span>
                </div>
                {hovered.newsCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><Newspaper className="h-3 w-3" /> Мэдээ</span>
                    <span className="font-semibold">{hovered.newsCount}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Сэтгэгдэл</span>
                  <span className={`font-semibold ${getSentimentKey(hovered.sentiment) === "positive" ? "text-green-500" : getSentimentKey(hovered.sentiment) === "negative" ? "text-red-500" : "text-muted-foreground"}`}>
                    {SENTIMENT_STYLES[getSentimentKey(hovered.sentiment)].label}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
