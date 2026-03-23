"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="w-12 h-12 rounded-lg bg-red-50 dark:bg-red-950/50 flex items-center justify-center mx-auto mb-4">
          <span className="text-red-500 text-xl">!</span>
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Алдаа гарлаа</h2>
        <p className="text-sm text-muted-foreground mb-6">{error.message || "Хуудсыг ачааллахад алдаа гарлаа."}</p>
        <button
          onClick={reset}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          Дахин оролдох
        </button>
      </div>
    </div>
  );
}
