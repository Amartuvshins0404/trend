// Shared category color system and sentiment utilities.
// Single source of truth — replaces per-page CAT, TAG_COLORS, CATEGORY_STYLES, CAT_COLORS.

export const CATEGORY_STYLES: Record<string, {
  dot: string;
  bg: string;
  text: string;
  fill: string;
  label: string;
}> = {
  topic:    { dot: "bg-primary", bg: "bg-primary/10", text: "text-primary", fill: "#3b82f6", label: "сэдэв" },
  entity:   { dot: "bg-[#31a24c]", bg: "bg-[#e6f4ea] dark:bg-[#1a8b3f]/20", text: "text-[#1a7431] dark:text-[#4ade80]", fill: "#31a24c", label: "нэр" },
  location: { dot: "bg-[#f5a623]", bg: "bg-[#f5a623]/10", text: "text-[#c68400] dark:text-[#ffc94d]", fill: "#f5a623", label: "газар" },
};

export function getCategoryStyle(category: string | null) {
  return CATEGORY_STYLES[category || ""] || CATEGORY_STYLES.topic;
}

// Sentiment thresholds
export const SENTIMENT_POSITIVE = 0.2;
export const SENTIMENT_NEGATIVE = -0.2;

// Sentiment display styles
export const SENTIMENT_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  positive: { label: "👍 Эерэг", bg: "bg-[#e6f4ea] dark:bg-[#1a8b3f]/25", text: "text-[#1a7431] dark:text-[#4ade80]" },
  neutral:  { label: "💬 Дунд",  bg: "bg-secondary", text: "text-muted-foreground" },
  negative: { label: "👎 Сөрөг", bg: "bg-[#fce8e6] dark:bg-[#c0392b]/25", text: "text-[#a61d17] dark:text-[#ff6b6b]" },
};

export function getSentimentKey(value: number | null): "positive" | "negative" | "neutral" {
  if (value === null) return "neutral";
  if (value > SENTIMENT_POSITIVE) return "positive";
  if (value < SENTIMENT_NEGATIVE) return "negative";
  return "neutral";
}

export function getSentimentColor(value: number | null): string {
  if (value === null) return "#8b8d91";
  if (value > SENTIMENT_POSITIVE) return "#1a8b3f";
  if (value < SENTIMENT_NEGATIVE) return "#c0392b";
  return "#8b8d91";
}

export function calculateAverageSentiment(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return valid.reduce((sum, v) => sum + v, 0) / valid.length;
}
