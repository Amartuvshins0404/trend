import { useState, useCallback, useEffect, useRef } from "react";

export function useTimelinePlayer(snapshotCount: number) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize to last snapshot when count changes
  useEffect(() => {
    if (snapshotCount > 0) setCurrentIndex(snapshotCount - 1);
  }, [snapshotCount]);

  // Auto-play
  useEffect(() => {
    if (playing && snapshotCount > 0) {
      interval.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= snapshotCount - 1) {
            setPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
    }
    return () => { if (interval.current) clearInterval(interval.current); };
  }, [playing, snapshotCount]);

  const play = useCallback(() => {
    if (currentIndex >= snapshotCount - 1) setCurrentIndex(0);
    setPlaying(true);
  }, [currentIndex, snapshotCount]);

  const pause = useCallback(() => setPlaying(false), []);

  const setIndex = useCallback((i: number) => {
    setPlaying(false);
    setCurrentIndex(i);
  }, []);

  return { currentIndex, playing, play, pause, setIndex };
}
