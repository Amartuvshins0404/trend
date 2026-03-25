"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/header";
import { CircleDot, Network } from "lucide-react";

const BubbleChart = dynamic(() => import("./bubble-chart"), { ssr: false });
const ForceGraph = dynamic(() => import("./force-graph"), { ssr: false });

export default function NetworkPage() {
  const [view, setView] = useState<"bubble" | "force">("bubble");

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      <Header />
      <main className="px-2 sm:px-4 py-2 flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 mb-2 shrink-0">
          <div className="flex items-center gap-0.5 bg-secondary rounded-full p-0.5">
            <button
              onClick={() => setView("bubble")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-full transition-colors ${
                view === "bubble" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CircleDot className="h-3.5 w-3.5" />Бөмбөлөг
            </button>
            <button
              onClick={() => setView("force")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-full transition-colors ${
                view === "force" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Network className="h-3.5 w-3.5" />Сүлжээ
            </button>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground ml-auto">
            {view === "bubble" ? (
              <>
                <span>🟢 эерэг</span>
                <span>🔴 сөрөг</span>
                <span>⚪ дунд</span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#4F46E5]" />сэдэв</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#059669]" />нэр</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#D97706]" />газар</span>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0">
          {view === "bubble" ? <BubbleChart /> : <ForceGraph />}
        </div>
      </main>
    </div>
  );
}
