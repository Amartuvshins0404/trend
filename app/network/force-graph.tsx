"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  forceSimulation, forceLink, forceManyBody, forceCenter,
  forceCollide, forceX, forceY,
  type SimulationNodeDatum, type SimulationLinkDatum,
} from "d3-force";
import * as THREE from "three";
import { getCategoryStyle } from "@/lib/constants";
import { ZoomIn, ZoomOut, Maximize2, GripHorizontal } from "lucide-react";

interface ApiNode { id: number; name: string; category: string | null; postCount: number }
interface ApiEdge { source: number; target: number; weight: number }
interface GNode extends SimulationNodeDatum {
  id: number; name: string; category: string | null; postCount: number; radius: number;
  idx: number;
  fx?: number | null; fy?: number | null;
}
interface GLink extends SimulationLinkDatum<GNode> { weight: number }

// Cache THREE.Color per category
const catColorCache: Record<string, THREE.Color> = {};
function getCatColor3(category: string | null): THREE.Color {
  const key = category || "topic";
  if (!catColorCache[key]) catColorCache[key] = new THREE.Color(getCategoryStyle(category).fill);
  return catColorCache[key];
}

export default function ForceGraph() {
  const mountRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<{ nodes: ApiNode[]; edges: ApiEdge[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const nodesRef = useRef<GNode[]>([]);
  const linksRef = useRef<GLink[]>([]);
  const simRef = useRef<ReturnType<typeof forceSimulation<GNode>> | null>(null);
  const hoveredRef = useRef<number | null>(null);
  const selectedRef = useRef<GNode | null>(null);
  const rafRef = useRef(0);
  const lastMoveRef = useRef(0);

  // Three.js refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const meshRef = useRef<THREE.InstancedMesh | null>(null);
  const edgeLinesRef = useRef<THREE.LineSegments | null>(null);
  const hlLinesRef = useRef<THREE.LineSegments | null>(null);
  const ringRef = useRef<THREE.Mesh | null>(null);

  const viewRef = useRef({ x: 0, y: 0, zoom: 0.5 });
  const sizeRef = useRef({ w: 0, h: 0 });
  const dragRef = useRef<{
    node: GNode | null; moved: boolean;
    panStart: { mx: number; my: number; vx: number; vy: number } | null;
  }>({ node: null, moved: false, panStart: null });

  const [selectedForUI, setSelectedForUI] = useState<GNode | null>(null);
  const [tooltipForUI, setTooltipForUI] = useState<{ x: number; y: number; node: GNode } | null>(null);

  const router = useRouter();

  // Fetch data
  useEffect(() => {
    setLoading(true);
    fetch("/api/trends/co-occurrence?days=7&min_count=1")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Screen pixel → world coordinate
  const screenToWorld = useCallback((sx: number, sy: number) => {
    const { w, h } = sizeRef.current;
    const v = viewRef.current;
    if (!w) return { x: 0, y: 0 };
    const halfW = (w / 2) / v.zoom;
    const halfH = (h / 2) / v.zoom;
    return {
      x: ((sx / w) - 0.5) * 2 * halfW - v.x,
      y: -(((sy / h) - 0.5) * 2 * halfH - v.y),
    };
  }, []);

  // Hit-test: find node at screen position
  const findNodeAt = useCallback((sx: number, sy: number): GNode | null => {
    const world = screenToWorld(sx, sy);
    const nodes = nodesRef.current;
    const zoom = viewRef.current.zoom;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (n.x == null) continue;
      const dx = world.x - n.x, dy = world.y - n.y!;
      const hitR = n.radius + 3 / zoom;
      if (dx * dx + dy * dy < hitR * hitR) return n;
    }
    return null;
  }, [screenToWorld]);

  // Reusable objects (avoid GC pressure in render loop)
  const _dummy = useRef(new THREE.Object3D());
  const _color = useRef(new THREE.Color());
  const _bgLight = useRef(new THREE.Color(0xf0f2f5));
  const _bgDark = useRef(new THREE.Color(0x18191a));

  // Push simulation state → Three.js buffers → render
  const render = useCallback(() => {
    const mesh = meshRef.current;
    const edgeLines = edgeLinesRef.current;
    const hlLines = hlLinesRef.current;
    const ring = ringRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    if (!mesh || !edgeLines || !camera || !renderer || !scene) return;

    const nodes = nodesRef.current;
    const links = linksRef.current;
    const hov = hoveredRef.current;
    const sel = selectedRef.current;
    const isDark = document.documentElement.classList.contains("dark");
    const bg = isDark ? _bgDark.current : _bgLight.current;
    scene.background = bg;

    const dummy = _dummy.current;
    const color = _color.current;

    // --- Nodes (InstancedMesh) ---
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.x == null) { dummy.scale.setScalar(0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); continue; }
      dummy.position.set(n.x, n.y!, 0);
      dummy.scale.setScalar(n.radius);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      const active = hov === n.id || sel?.id === n.id;
      color.copy(getCatColor3(n.category));
      if (!active) color.lerp(bg, isDark ? 0.35 : 0.45);
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    // --- Edges (LineSegments) ---
    const ePos = edgeLines.geometry.attributes.position as THREE.BufferAttribute;
    let ei = 0;
    for (const link of links) {
      const s = link.source as GNode, t = link.target as GNode;
      if (s.x == null || t.x == null) { ePos.setXYZ(ei, 0, 0, -999); ePos.setXYZ(ei + 1, 0, 0, -999); ei += 2; continue; }
      ePos.setXYZ(ei++, s.x, s.y!, -0.1);
      ePos.setXYZ(ei++, t.x, t.y!, -0.1);
    }
    ePos.needsUpdate = true;
    (edgeLines.material as THREE.LineBasicMaterial).color.set(isDark ? 0x60a5fa : 0x6366f1);
    (edgeLines.material as THREE.LineBasicMaterial).opacity = isDark ? 0.06 : 0.08;

    // --- Highlighted edges ---
    if (hlLines && hov != null) {
      const hlPos = hlLines.geometry.attributes.position as THREE.BufferAttribute;
      let hi = 0;
      for (const link of links) {
        const s = link.source as GNode, t = link.target as GNode;
        if (s.x == null || t.x == null) continue;
        if (hov !== s.id && hov !== t.id) continue;
        if (hi + 1 < hlPos.count) { hlPos.setXYZ(hi++, s.x, s.y!, 0.05); hlPos.setXYZ(hi++, t.x, t.y!, 0.05); }
      }
      for (let j = hi; j < hlPos.count; j++) hlPos.setXYZ(j, 0, 0, -999);
      hlPos.needsUpdate = true;
      hlLines.visible = true;
      (hlLines.material as THREE.LineBasicMaterial).color.set(isDark ? 0x60a5fa : 0x3b82f6);
    } else if (hlLines) {
      hlLines.visible = false;
    }

    // --- Highlight ring ---
    if (ring) {
      const activeNode = hov != null ? nodes.find(n => n.id === hov) : sel;
      if (activeNode && activeNode.x != null) {
        ring.position.set(activeNode.x, activeNode.y!, 0.02);
        ring.scale.setScalar(activeNode.radius * 1.6);
        ring.visible = true;
        (ring.material as THREE.MeshBasicMaterial).color.copy(getCatColor3(activeNode.category));
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.25;
      } else {
        ring.visible = false;
      }
    }

    // --- Camera ---
    const v = viewRef.current;
    const { w, h } = sizeRef.current;
    const halfW = (w / 2) / v.zoom;
    const halfH = (h / 2) / v.zoom;
    camera.left = -halfW - v.x;
    camera.right = halfW - v.x;
    camera.top = halfH + v.y;
    camera.bottom = -halfH + v.y;
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
  }, []);

  const scheduleRender = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(render);
  }, [render]);

  // --- Init Three.js + D3-force ---
  useEffect(() => {
    if (!data || !containerRef.current || !mountRef.current) return;
    const container = containerRef.current;
    const mount = mountRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight || (window.innerHeight - 120);
    sizeRef.current = { w, h };

    // Scene
    const scene = new THREE.Scene();
    const isDark = document.documentElement.classList.contains("dark");
    scene.background = new THREE.Color(isDark ? 0x18191a : 0xf0f2f5);
    sceneRef.current = scene;

    // Orthographic camera (2D view)
    const camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.1, 100);
    camera.position.z = 10;
    cameraRef.current = camera;

    // WebGL renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    while (mount.firstChild) mount.removeChild(mount.firstChild);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    // --- Build graph data ---
    const maxP = Math.max(...data.nodes.map(n => n.postCount), 1);
    const nodes: GNode[] = data.nodes.map((n, i) => ({
      ...n, idx: i, radius: 3 + (n.postCount / maxP) * 20,
    }));
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const links: GLink[] = data.edges
      .filter(e => nodeMap.has(e.source) && nodeMap.has(e.target))
      .map(e => ({ source: nodeMap.get(e.source)!, target: nodeMap.get(e.target)!, weight: e.weight }));

    nodesRef.current = nodes;
    linksRef.current = links;
    selectedRef.current = null;
    setSelectedForUI(null);
    viewRef.current = { x: 0, y: 0, zoom: 0.5 };

    // --- InstancedMesh for nodes (1 draw call) ---
    const circleGeo = new THREE.CircleGeometry(1, 24);
    const nodeMat = new THREE.MeshBasicMaterial({ toneMapped: false });
    const mesh = new THREE.InstancedMesh(circleGeo, nodeMat, nodes.length);
    scene.add(mesh);
    meshRef.current = mesh;

    // --- LineSegments for edges (1 draw call) ---
    const edgeBuf = new Float32Array(links.length * 2 * 3);
    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute("position", new THREE.BufferAttribute(edgeBuf, 3));
    const edgeMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.06, depthWrite: false });
    const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
    scene.add(edgeLines);
    edgeLinesRef.current = edgeLines;

    // --- Highlight edges ---
    const hlBuf = new Float32Array(links.length * 2 * 3);
    const hlGeo = new THREE.BufferGeometry();
    hlGeo.setAttribute("position", new THREE.BufferAttribute(hlBuf, 3));
    const hlMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.5, depthWrite: false });
    const hlLines = new THREE.LineSegments(hlGeo, hlMat);
    hlLines.visible = false;
    scene.add(hlLines);
    hlLinesRef.current = hlLines;

    // --- Highlight ring ---
    const ringGeo = new THREE.RingGeometry(0.85, 1.0, 32);
    const ringMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.visible = false;
    scene.add(ring);
    ringRef.current = ring;

    // --- D3-force simulation ---
    if (simRef.current) simRef.current.stop();
    const n = nodes.length;
    const charge = n > 2000 ? -60 : n > 500 ? -120 : -200;
    const linkDist = n > 2000 ? 60 : n > 500 ? 90 : 120;

    const sim = forceSimulation<GNode>(nodes)
      .force("link", forceLink<GNode, GLink>(links).id(d => d.id).distance(linkDist).strength(0.04))
      .force("charge", forceManyBody().strength(charge).distanceMax(n > 1000 ? 300 : 500))
      .force("center", forceCenter(0, 0))
      .force("x", forceX(0).strength(0.02))
      .force("y", forceY(0).strength(0.02))
      .force("collide", forceCollide<GNode>().radius(d => d.radius + 4).strength(0.6))
      .alphaDecay(0.06)
      .alphaMin(0.01)
      .on("tick", () => { cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(render); });

    simRef.current = sim;

    // Resize handler
    const onResize = () => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      sizeRef.current = { w: nw, h: nh };
      renderer.setSize(nw, nh);
      scheduleRender();
    };
    window.addEventListener("resize", onResize);

    // Theme observer
    const themeObs = new MutationObserver(() => scheduleRender());
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      sim.stop();
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      themeObs.disconnect();
      renderer.dispose();
      circleGeo.dispose();
      nodeMat.dispose();
      edgeGeo.dispose();
      edgeMat.dispose();
      hlGeo.dispose();
      hlMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
    };
  }, [data, render, scheduleRender]);

  // --- Mouse handlers ---
  const pos = (e: React.MouseEvent) => {
    const r = containerRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onMouseDown = (e: React.MouseEvent) => {
    const p = pos(e);
    const node = findNodeAt(p.x, p.y);
    if (node) {
      dragRef.current = { node, moved: false, panStart: null };
      node.fx = node.x;
      node.fy = node.y;
      simRef.current?.alphaTarget(0.3).restart();
    } else {
      const v = viewRef.current;
      dragRef.current = { node: null, moved: false, panStart: { mx: p.x, my: p.y, vx: v.x, vy: v.y } };
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const p = pos(e);
    const drag = dragRef.current;
    const el = containerRef.current;

    if (drag.node) {
      drag.moved = true;
      const world = screenToWorld(p.x, p.y);
      drag.node.fx = world.x;
      drag.node.fy = world.y;
      if (el) el.style.cursor = "grabbing";
      return;
    }

    if (drag.panStart) {
      drag.moved = true;
      const v = viewRef.current;
      v.x = drag.panStart.vx + (p.x - drag.panStart.mx) / v.zoom;
      v.y = drag.panStart.vy + (p.y - drag.panStart.my) / v.zoom;
      if (el) el.style.cursor = "grabbing";
      scheduleRender();
      return;
    }

    // Throttle hover to ~30fps
    const now = performance.now();
    if (now - lastMoveRef.current < 33) return;
    lastMoveRef.current = now;

    const node = findNodeAt(p.x, p.y);
    const prev = hoveredRef.current;
    if (node) {
      hoveredRef.current = node.id;
      if (prev !== node.id) setTooltipForUI({ x: p.x, y: p.y, node });
      else setTooltipForUI(tp => tp ? { ...tp, x: p.x, y: p.y } : null);
      if (el) el.style.cursor = "pointer";
    } else {
      hoveredRef.current = null;
      if (prev !== null) setTooltipForUI(null);
      if (el) el.style.cursor = "default";
    }
    if (prev !== hoveredRef.current) scheduleRender();
  };

  const onMouseUp = () => {
    const drag = dragRef.current;
    if (!drag.moved) {
      if (drag.node) { selectedRef.current = drag.node; setSelectedForUI(drag.node); }
      else { selectedRef.current = null; setSelectedForUI(null); }
      scheduleRender();
    }
    if (drag.node) { drag.node.fx = null; drag.node.fy = null; simRef.current?.alphaTarget(0); }
    dragRef.current = { node: null, moved: false, panStart: null };
    if (containerRef.current) containerRef.current.style.cursor = "default";
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const v = viewRef.current;
    v.zoom = Math.max(0.02, Math.min(15, v.zoom * (e.deltaY < 0 ? 1.12 : 0.89)));
    scheduleRender();
  };

  const zoomBy = (f: number) => { viewRef.current.zoom = Math.max(0.02, Math.min(15, viewRef.current.zoom * f)); scheduleRender(); };
  const resetView = () => { viewRef.current = { x: 0, y: 0, zoom: 0.5 }; scheduleRender(); };
  const clearSelection = () => { selectedRef.current = null; setSelectedForUI(null); scheduleRender(); };

  return (
    <div className="flex flex-col h-full">
      <div ref={containerRef} className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Ачаалж байна...</div>
        ) : !data || data.nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="text-sm text-muted-foreground">Мэдээлэл байхгүй</div>
          </div>
        ) : (
          <>
            <div
              ref={mountRef}
              className="w-full h-full"
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={() => { onMouseUp(); hoveredRef.current = null; setTooltipForUI(null); scheduleRender(); }}
              onWheel={onWheel}
            />

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

            <div className="absolute top-4 left-4 hidden sm:flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 shadow-sm text-[11px] text-muted-foreground">
              <GripHorizontal className="h-3.5 w-3.5" />
              Чирэх · Томруулах · Дарж дэлгэрэнгүй
            </div>

            <div className="absolute bottom-4 left-4 bg-card border border-border rounded-lg px-3 py-2 shadow-sm">
              <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                {data.nodes.length} сэдэв · {data.edges.length} холбоос
              </span>
            </div>

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
