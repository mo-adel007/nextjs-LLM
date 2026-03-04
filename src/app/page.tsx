"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { DecideResponse } from "@/lib/types";

// Default request payload for the main landing demo.
const DEFAULT_REQUEST = {
  visitor: {
    visitorProfile: "New Visitor",
  },
  rules: {
    tone: "Professional" as const,
    length: "Short" as const,
    emphasis: "Trust" as const,
  },
};

export default function Home() {
  // Stores API response shown in the hero panel.
  const [result, setResult] = useState<DecideResponse | null>(null);
  // Tracks loading state for fetch lifecycle.
  const [isLoading, setIsLoading] = useState(false);
  // Tracks request errors without crashing UI.
  const [error, setError] = useState<string | null>(null);

  // Calls /api/decide and stores safe response for rendering.
  const loadCopy = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(DEFAULT_REQUEST),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as DecideResponse;
      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setIsLoading(false);
    }
  };

  // Load one personalized variant when the page opens.
  useEffect(() => {
    void loadCopy();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-14 text-zinc-100">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Next.js + Constrained LLM</p>
          <h1 className="text-3xl font-semibold">Safe Personalized Copy Assistant</h1>
          <p className="text-zinc-300">
            This demo generates copy from an LLM-style component and enforces a strict validation boundary
            (`usedClaimIds ⊆ allowedClaims`) before rendering.
          </p>
        </header>

        <section className="space-y-3 rounded-xl border border-zinc-700 bg-zinc-950/50 p-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">Rendered Variant</h2>

          {isLoading && <p className="text-zinc-300">Generating safe copy…</p>}
          {error && <p className="text-red-300">Error: {error}</p>}

          {result && (
            <div className="space-y-2">
              <p className="text-2xl font-semibold text-emerald-300">{result.headline1}</p>
              <p className="text-lg text-zinc-200">{result.headline2}</p>
              <p className="text-sm text-zinc-400">
                Used claim IDs: {result.usedClaimIds.join(", ") || "none"} · Attempts: {result.attempts} · Fallback:{" "}
                {result.isFallback ? "yes" : "no"}
              </p>
            </div>
          )}
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void loadCopy()}
            className="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-zinc-950 hover:bg-emerald-400"
          >
            Regenerate
          </button>
          <Link
            href="/admin"
            className="rounded-lg border border-zinc-600 px-4 py-2 font-medium text-zinc-100 hover:border-zinc-400"
          >
            Open Admin Preview
          </Link>
        </div>
      </main>
    </div>
  );
}
