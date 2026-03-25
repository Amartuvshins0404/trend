"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ThumbsUp, MessageSquare, Share2, ExternalLink, X, Search,
} from "lucide-react";
import { Header } from "@/components/header";
import { formatDate } from "@/lib/utils";
import { getCategoryStyle } from "@/lib/constants";

interface Post {
  postId: string;
  content: string;
  url: string;
  imageUrl: string | null;
  likes: number;
  commentCount: number;
  shareCount: number;
  author: string | null;
  authorAvatar: string | null;
  group: string | null;
  tags: { name: string; category: string | null; sentiment: string | null }[];
  createdAt: string;
}

export default function PostsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background"><Header /></div>}>
      <PostsContent />
    </Suspense>
  );
}

function PostsContent() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const days = 7;
  const [page, setPage] = useState(0);
  const perPage = 30;
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTag = searchParams.get("tag") || "";

  useEffect(() => {
    setPage(0);
  }, [activeTag]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ days: String(days), limit: String(perPage), offset: String(page * perPage) });
    if (activeTag) params.set("tag", activeTag);
    fetch(`/api/posts/?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setPosts(d.posts || d);
        setTotal(d.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeTag, page]);

  const setTag = (tag: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tag) params.set("tag", tag);
    else params.delete("tag");
    router.push(`/posts?${params}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6 sm:py-8">
        {/* Title + filter */}
        <div className="flex items-center justify-between mb-6 animate-fade-in-up">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Постууд</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {loading ? "..." : `${total} пост`}
              {activeTag && (
                <span className="ml-1">
                  · <span className="text-primary">{activeTag}</span>
                  <button onClick={() => setTag("")} className="ml-1 text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-3 w-3 inline" />
                  </button>
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Posts grid */}
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 skeleton-shimmer rounded-lg" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-sm text-muted-foreground">
            Пост олдсонгүй
          </div>
        ) : (
          <div className="space-y-3">
            {posts.length > 0 && total > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>{page * perPage + 1}–{Math.min((page + 1) * perPage, total)} / {total}</span>
              </div>
            )}
            {posts.map((post, i) => (
              <a
                key={post.postId}
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-card rounded-lg shadow-sm p-3 sm:p-4 hover:bg-[var(--hover-surface)] transition-colors animate-fade-in-up"
                style={{ animationDelay: `${i * 20}ms` }}
              >
                <div className="flex gap-3 sm:gap-5">
                  {/* Image */}
                  {post.imageUrl && (
                    <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-secondary">
                      <img
                        src={post.imageUrl}
                        alt={post.content ? post.content.slice(0, 100) : "Постын зураг"}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {/* Meta */}
                    <div className="flex items-center gap-2 mb-1.5 min-w-0">
                      {post.author && (
                        <span className="text-[13px] font-semibold text-foreground truncate">{post.author}</span>
                      )}
                      {post.group && (
                        <span className="text-xs text-muted-foreground truncate hidden sm:inline">{post.group}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                        {formatDate(post.createdAt, "time")}
                      </span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>

                    {/* Content */}
                    <p className="text-[13px] leading-relaxed text-muted-foreground line-clamp-2 mb-3">
                      {post.content}
                    </p>

                    {/* Tags + engagement */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {post.tags.slice(0, 4).map((tag) => {
                        const tc = getCategoryStyle(tag.category);
                        return (
                          <button
                            key={tag.name}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTag(tag.name); }}
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${tc.bg} ${tc.text} hover:opacity-80 transition-opacity`}
                          >
                            {tag.name}
                          </button>
                        );
                      })}

                      <div className="flex items-center gap-2 sm:gap-3 ml-auto text-[11px] text-muted-foreground tabular-nums shrink-0">
                        <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{post.likes}</span>
                        <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{post.commentCount}</span>
                        <span className="hidden sm:flex items-center gap-1"><Share2 className="h-3 w-3" />{post.shareCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </a>
            ))}
            {/* Pagination */}
            {total > perPage && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 text-[13px] font-medium rounded-md bg-secondary text-foreground hover:bg-border disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Өмнөх
                </button>
                <span className="text-xs text-muted-foreground tabular-nums px-3">
                  {page + 1} / {Math.ceil(total / perPage)}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={(page + 1) * perPage >= total}
                  className="px-4 py-2 text-[13px] font-medium rounded-md bg-secondary text-foreground hover:bg-border disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Дараах →
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
