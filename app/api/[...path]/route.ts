import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

const API_MODE = process.env.API_MODE || "mock"; // "mock" | "test" | "prod"
const API_URLS: Record<string, string | undefined> = {
  test: process.env.API_URL_TEST,
  prod: process.env.API_URL_PROD,
};
const API_URL = API_URLS[API_MODE];
const MOCK_DIR = path.join(process.cwd(), "mock");

const MOCK_MAP: Record<string, string> = {
  "/api/trends/top": "mock_top.json",
  "/api/trends/overview": "mock_overview.json",
  "/api/trends/timeline": "mock_timeline.json",
  "/api/trends/digest": "mock_digest.json",
  "/api/trends/co-occurrence": "mock_network.json",
  "/api/trends/search": "mock_top.json",
  "/api/posts/": "mock_posts.json",
  "/api/news/": "mock_news.json",
  "/api/health": "",
};

async function proxyToBackend(request: NextRequest): Promise<Response> {
  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  const url = `${API_URL}${pathname}${search}`;

  const res = await fetch(url, {
    method: request.method,
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}

function serveMock(request: NextRequest): Response {
  const pathname = request.nextUrl.pathname;

  // Health check
  if (pathname === "/api/health") {
    return Response.json({ status: "ok", mode: API_MODE });
  }

  // Tag detail
  if (pathname.startsWith("/api/trends/tag/")) {
    const topData = JSON.parse(fs.readFileSync(path.join(MOCK_DIR, "mock_top.json"), "utf-8"));
    const tag = topData[0] || { id: 1, name: "mock", category: "topic" };
    return Response.json({
      tag: { id: tag.id, name: tag.name, category: tag.category },
      timeline: tag.dailyData || [],
      recentPosts: [],
      recentNews: [],
    });
  }

  // Find matching mock file
  for (const [route, file] of Object.entries(MOCK_MAP)) {
    if (pathname.startsWith(route) && file) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(MOCK_DIR, file), "utf-8"));
        return Response.json(data);
      } catch {
        return Response.json({ error: "Mock file not found" }, { status: 404 });
      }
    }
  }

  return Response.json({ error: "Not found", path: pathname, mode: "mock" }, { status: 404 });
}

export async function GET(request: NextRequest) {
  if (API_URL) {
    try {
      return await proxyToBackend(request);
    } catch {
      // Fall back to mock data if backend is unreachable
      return serveMock(request);
    }
  }
  return serveMock(request);
}
