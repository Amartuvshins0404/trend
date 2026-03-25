import { useEffect, useState } from "react";

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

export type { TagTrend, Overview, Post, TimelineTag, DaySnapshot };

export function useDashboardData(days: number) {
  const [trends, setTrends] = useState<TagTrend[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [hotPosts, setHotPosts] = useState<Post[]>([]);
  const [tlSnapshots, setTlSnapshots] = useState<DaySnapshot[]>([]);
  const [loading, setLoading] = useState(true);

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
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [days]);

  return { trends, overview, hotPosts, tlSnapshots, loading };
}
