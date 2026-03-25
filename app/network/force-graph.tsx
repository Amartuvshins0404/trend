"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  forceSimulation, forceLink, forceManyBody, forceCenter,
  forceCollide, forceX, forceY,
  type SimulationNodeDatum, type SimulationLinkDatum,
} from "d3-force";
import { Header } from "@/components/header";
import { useTheme } from "@/components/theme-provider";
import { CATEGORY_STYLES, getCategoryStyle } from "@/lib/constants";
import { ZoomIn, ZoomOut, Maximize2, GripHorizontal } from "lucide-react";

interface ApiNode { id: number; name: string; category: string | null; postCount: number }
interface ApiEdge { source: number; target: number; weight: number }
interface GNode extends SimulationNodeDatum {
  id: number; name: string; category: string | null; postCount: number; radius: number;
  fx?: number | null; fy?: number | null;
}
interface GLink extends SimulationLinkDatum<GNode> { weight: number }

export default function ForceGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<{ nodes: ApiNode[]; edges: ApiEdge[] } | null>(null);
  const [loading, setLoading] = useState(true);

  // ALL interaction state in refs — zero re-renders during interaction
  const nodesRef = useRef<GNode[]>([]);
  const linksRef = useRef<GLink[]>([]);
  const simRef = useRef<ReturnType<typeof forceSimulation<GNode>> | null>(null);
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const dragRef = useRef<{ node: GNode | null; moved: boolean; panStart: { mx: number; my: number; tx: number; ty: number } | null }>({ node: null, moved: false, panStart: null });
  const hoveredRef = useRef<number | null>(null);
  const selectedRef = useRef<GNode | null>(null);
  const rafRef = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0 });

  // Only these two cause re-renders (for the overlay UI)
  const [selectedForUI, setSelectedForUI] = useState<GNode | null>(null);
  const [tooltipForUI, setTooltipForUI] = useState<{ x: number; y: number; node: GNode } | null>(null);

  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const themeRef = useRef(resolvedTheme);
  themeRef.current = resolvedTheme;

  // Fetch — always 7 days, min_count=1
  useEffect(() => {
    setLoading(true);
    fetch("/api/trends/co-occurrence?days=7&min_count=1")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Coordinate transforms
  const screenToWorld = (sx: number, sy: number) => {
    const t = transformRef.current;
    return { x: (sx - t.x) / t.k, y: (sy - t.y) / t.k };
  };

  const findNodeAt = (sx: number, sy: number): GNode | null => {
    const { x: wx, y: wy } = screenToWorld(sx, sy);
    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const n = nodesRef.current[i];
      if (n.x == null) continue;
      const dx = wx - n.x, dy = wy - n.y!;
      if (dx * dx + dy * dy < (n.radius + 4) ** 2) return n;
    }
    return null;
  };

  // Draw — reads ONLY from refs, zero deps
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    const t = transformRef.current;
    const hov = hoveredRef.current;
    const sel = selectedRef.current;
    const nodes = nodesRef.current;
    const links = linksRef.current;

    ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.scale(t.k, t.k);

    const isDark = themeRef.current === "dark";

    // Edges
    for (const link of links) {
      const s = link.source as GNode, tg = link.target as GNode;
      if (s.x == null || tg.x == null) continue;
      const hi = hov != null && (hov === s.id || hov === tg.id);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y!);
      ctx.lineTo(tg.x, tg.y!);
      ctx.strokeStyle = hi
        ? (isDark ? "rgba(96,165,250,0.5)" : "rgba(59,130,246,0.5)")
        : (isDark ? "rgba(96,165,250,0.12)" : "rgba(99,102,241,0.15)");
      ctx.lineWidth = hi ? Math.max(link.weight * 1.5, 3) : Math.max(link.weight, 1.5);
      ctx.stroke();
    }

    // Nodes
    for (const node of nodes) {
      if (node.x == null) continue;
      const c = getCategoryStyle(node.category);
      const active = hov === node.id || sel?.id === node.id;
      const r = node.radius;

      // Outer glow
      if (active) {
        ctx.beginPath();
        ctx.arc(node.x, node.y!, r + 10, 0, Math.PI * 2);
        ctx.fillStyle = c.fill + "20";
        ctx.fill();
      }

      // Filled circle
      ctx.beginPath();
      ctx.arc(node.x, node.y!, r, 0, Math.PI * 2);
      ctx.fillStyle = active ? c.fill + "30" : c.fill + (isDark ? "20" : "15");
      ctx.fill();
      ctx.strokeStyle = active ? c.fill : c.fill + (isDark ? "50" : "40");
      ctx.lineWidth = active ? 2.5 : 1.5;
      ctx.stroke();

      // Center dot
      ctx.beginPath();
      ctx.arc(node.x, node.y!, Math.max(3, r * 0.25), 0, Math.PI * 2);
      ctx.fillStyle = c.fill;
      ctx.fill();

      // Label
      const fs = Math.max(10, Math.min(14, r * 0.5));
      ctx.font = `${active ? 600 : 500} ${fs}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const text = node.name;
      const tw = ctx.measureText(text).width;
      const tx = node.x, ty = node.y! + r + 6;
      // Label pill
      ctx.fillStyle = isDark ? "rgba(15,23,42,0.9)" : "rgba(255,255,255,0.92)";
      const pad = 5;
      ctx.beginPath();
      const bw = tw + pad * 2, bh = fs + pad;
      ctx.roundRect(tx - bw / 2, ty - 2, bw, bh, 4);
      ctx.fill();
      ctx.fillStyle = active
        ? (isDark ? "#e2e8f0" : "#0f172a")
        : (isDark ? "#94a3b8" : "#374151");
      ctx.fillText(text, tx, ty + 1);
    }

    ctx.restore();
  }, []); // NO deps — reads everything from refs

  // Build simulation — only rebuilds when data changes
  useEffect(() => {
    if (!data || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    sizeRef.current = { w, h };
    transformRef.current = { x: w / 2, y: h / 2, k: 0.85 };

    const maxP = Math.max(...data.nodes.map((n) => n.postCount), 1);
    const nodes: GNode[] = data.nodes.map((n) => ({ ...n, radius: 10 + (n.postCount / maxP) * 30 }));
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const links: GLink[] = data.edges
      .filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target))
      .map((e) => ({ source: nodeMap.get(e.source)!, target: nodeMap.get(e.target)!, weight: e.weight }));

    nodesRef.current = nodes;
    linksRef.current = links;
    selectedRef.current = null;
    setSelectedForUI(null);

    if (simRef.current) simRef.current.stop();

    const sim = forceSimulation<GNode>(nodes)
      .force("link", forceLink<GNode, GLink>(links).id((d) => d.id).distance(120).strength(0.2))
      .force("charge", forceManyBody().strength(-250))
      .force("center", forceCenter(0, 0))
      .force("x", forceX(0).strength(0.03))
      .force("y", forceY(0).strength(0.03))
      .force("collide", forceCollide<GNode>().radius((d) => d.radius + 8).strength(0.7))
      .alphaDecay(0.02)
      .on("tick", () => {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(draw);
      });

    simRef.current = sim;
    return () => { sim.stop(); cancelAnimationFrame(rafRef.current); };
  }, [data, draw]);

  // Canvas position helper
  const pos = (e: React.MouseEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  // Schedule a single draw
  const redraw = () => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const p = pos(e);
    const node = findNodeAt(p.x, p.y);
    if (node) {
      dragRef.current = { node, moved: false, panStart: null };
      node.fx = node.x;
      node.fy = node.y;
      simRef.current?.alphaTarget(0.3).restart();
    } else {
      const t = transformRef.current;
      dragRef.current = { node: null, moved: false, panStart: { mx: p.x, my: p.y, tx: t.x, ty: t.y } };
    }
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const p = pos(e);
    const drag = dragRef.current;

    if (drag.node) {
      drag.moved = true;
      const world = screenToWorld(p.x, p.y);
      drag.node.fx = world.x;
      drag.node.fy = world.y;
      canvasRef.current!.style.cursor = "grabbing";
      return;
    }

    if (drag.panStart) {
      drag.moved = true;
      transformRef.current.x = drag.panStart.tx + (p.x - drag.panStart.mx);
      transformRef.current.y = drag.panStart.ty + (p.y - drag.panStart.my);
      canvasRef.current!.style.cursor = "grabbing";
      redraw();
      return;
    }

    // Hover
    const node = findNodeAt(p.x, p.y);
    const prevHov = hoveredRef.current;
    if (node) {
      hoveredRef.current = node.id;
      if (prevHov !== node.id) setTooltipForUI({ x: p.x, y: p.y, node });
      else setTooltipForUI((prev) => prev ? { ...prev, x: p.x, y: p.y } : null);
      canvasRef.current!.style.cursor = "pointer";
    } else {
      hoveredRef.current = null;
      if (prevHov !== null) setTooltipForUI(null);
      canvasRef.current!.style.cursor = "default";
    }
    if (prevHov !== hoveredRef.current) redraw();
  };

  const onMouseUp = () => {
    const drag = dragRef.current;

    // Click (not drag) — toggle selection
    if (!drag.moved) {
      if (drag.node) {
        selectedRef.current = drag.node;
        setSelectedForUI(drag.node);
      } else {
        selectedRef.current = null;
        setSelectedForUI(null);
      }
      redraw();
    }

    if (drag.node) {
      drag.node.fx = null;
      drag.node.fy = null;
      simRef.current?.alphaTarget(0);
    }
    dragRef.current = { node: null, moved: false, panStart: null };
    if (canvasRef.current) canvasRef.current.style.cursor = "default";
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const p = pos(e);
    const t = transformRef.current;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const newK = Math.max(0.15, Math.min(5, t.k * factor));
    t.x = p.x - (p.x - t.x) * (newK / t.k);
    t.y = p.y - (p.y - t.y) * (newK / t.k);
    t.k = newK;
    redraw();
  };

  const zoomBy = (factor: number) => {
    const t = transformRef.current;
    const { w, h } = sizeRef.current;
    const cx = w / 2, cy = h / 2;
    const newK = Math.max(0.15, Math.min(5, t.k * factor));
    t.x = cx - (cx - t.x) * (newK / t.k);
    t.y = cy - (cy - t.y) * (newK / t.k);
    t.k = newK;
    redraw();
  };

  const resetView = () => {
    const { w, h } = sizeRef.current;
    transformRef.current = { x: w / 2, y: h / 2, k: 0.85 };
    redraw();
  };

  const clearSelection = () => {
    selectedRef.current = null;
    setSelectedForUI(null);
    redraw();
  };

  return (
    <div className="flex flex-col">
      <div ref={containerRef} className="flex-1 relative" style={{ height: "calc(100vh - 120px)" }}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Ачаалж байна...</div>
        ) : !data || data.nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="text-sm text-muted-foreground">Мэдээлэл байхгүй</div>
            <div className="text-xs text-muted-foreground">Минимум утгыг бууруулж үзнэ үү</div>
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={() => { onMouseUp(); hoveredRef.current = null; setTooltipForUI(null); redraw(); }}
              onWheel={onWheel}
            />

            {/* Zoom controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-1">
              {[
                { icon: <ZoomIn className="h-4 w-4" />, fn: () => zoomBy(1.3) },
                { icon: <ZoomOut className="h-4 w-4" />, fn: () => zoomBy(0.7) },
                { icon: <Maximize2 className="h-4 w-4" />, fn: resetView },
              ].map((btn, i) => (
                <button key={i} onClick={btn.fn} className="w-9 h-9 bg-card border border-border rounded-lg shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  {btn.icon}
                </button>
              ))}
            </div>

            {/* Help */}
            <div className="absolute top-4 left-4 hidden sm:flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 shadow-sm text-[11px] text-muted-foreground">
              <GripHorizontal className="h-3.5 w-3.5" />
              Чирэх · Томруулах · Дарж дэлгэрэнгүй
            </div>

            {/* Info */}
            <div className="absolute bottom-4 left-4 bg-card border border-border rounded-lg px-3 py-2 shadow-sm">
              <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                {data.nodes.length} сэдэв · {data.edges.length} холбоос
              </span>
            </div>

            {/* Selected panel */}
            {selectedForUI && (
              <div className="absolute bottom-4 right-4 w-64 sm:w-72 bg-card border border-border rounded-2xl shadow-lg p-4 sm:p-5 animate-fade-in-up">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{selectedForUI.name}</h3>
                    {selectedForUI.category && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 inline-block"
                        style={{ backgroundColor: getCategoryStyle(selectedForUI.category).fill + "20", color: getCategoryStyle(selectedForUI.category).fill }}>
                        {getCategoryStyle(selectedForUI.category).label}
                      </span>
                    )}
                  </div>
                  <button onClick={clearSelection} className="text-muted-foreground hover:text-foreground text-lg leading-none">&times;</button>
                </div>
                <div className="text-sm text-muted-foreground mb-4">{selectedForUI.postCount} пост</div>
                <button
                  onClick={() => router.push(`/tag/${selectedForUI.id}`)}
                  className="w-full py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Дэлгэрэнгүй үзэх →
                </button>
              </div>
            )}

            {/* Tooltip */}
            {tooltipForUI && !selectedForUI && (
              <div className="absolute pointer-events-none" style={{ left: tooltipForUI.x + 16, top: tooltipForUI.y - 8, transform: "translateY(-100%)" }}>
                <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
                  <div className="text-[13px] font-semibold text-foreground">{tooltipForUI.node.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{tooltipForUI.node.postCount} пост</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
