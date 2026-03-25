import { useState, useCallback, useRef } from "react";
import type { TagTrend } from "./use-dashboard-data";

export function useTagSearch(trends: TagTrend[]) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TagTrend[] | null>(null);
  const [searching, setSearching] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = searchResults !== null
    ? searchResults
    : trends.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()));

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (timeout.current) clearTimeout(timeout.current);
    if (!q.trim() || q.length < 2) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    // If local trends already match, don't hit API
    const localMatches = trends.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()));
    if (localMatches.length > 0) {
      setSearchResults(null);
      return;
    }
    // Debounce API search
    setSearching(true);
    timeout.current = setTimeout(() => {
      fetch(`/api/trends/search?q=${encodeURIComponent(q)}&limit=20`)
        .then((r) => r.json())
        .then((data) => {
          setSearchResults(data.map((t: { id: number; name: string; category: string | null; score: number; postCount: number; newsCount: number }) => ({
            ...t, totalReactions: 0, totalComments: 0, totalShares: 0, trend: "stable" as const, dailyData: [],
          })));
          setSearching(false);
        })
        .catch(() => { setSearchResults(null); setSearching(false); });
    }, 300);
  }, [trends]);

  return { query, filtered, searching, handleSearch, searchResults };
}
