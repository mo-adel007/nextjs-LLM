"use client";

import Link from "next/link";
import { useState } from "react";

import type { DecideRequest, DecideResponse } from "@/lib/types";

// Preset visitor profiles used for admin preview.
const PRESET_VISITORS: Record<string, DecideRequest["visitor"]> = {
  "Mobile Egypt": { visitorProfile: "Mobile Egypt", country: "EG", deviceType: "mobile" },
  "Google Visitor": { visitorProfile: "Google Visitor", referrerDomain: "google.com" },
  Startup: { visitorProfile: "Startup" },
};

export default function AdminPage() {
  // Selected visitor preset key.
  const [presetKey, setPresetKey] = useState<keyof typeof PRESET_VISITORS>("Mobile Egypt");
  // Selected tone value.
  const [tone, setTone] = useState<"Professional" | "Playful">("Professional");
  // Selected length value.
  const [length, setLength] = useState<"Short" | "Detailed">("Short");
  // Selected emphasis value.
  const [emphasis, setEmphasis] = useState<"Urgency" | "Trust">("Trust");
  // Latest API response shown in preview card.
  const [result, setResult] = useState<DecideResponse | null>(null);
  // Request in-flight state.
  const [isLoading, setIsLoading] = useState(false);
  // Error state for failed preview calls.
  const [error, setError] = useState<string | null>(null);

  // Submits preview request with selected visitor + demo rules.
  const previewVariant = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const payload: DecideRequest = {
        visitor: PRESET_VISITORS[presetKey],
        rules: { tone, length, emphasis },
      };

      const response = await fetch("/api/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Preview request failed with status ${response.status}`);
      }

      const data = (await response.json()) as DecideResponse;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected preview error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 px-6 py-14 text-zinc-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 rounded-2xl bg-white p-8 shadow-lg">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Admin Preview</p>
          <h1 className="text-3xl font-semibold">Rule + Visitor Playground</h1>
          <p className="text-zinc-600">Use presets and rules to preview validated copy variants.</p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Visitor preset
            <select
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={presetKey}
              onChange={(event) => setPresetKey(event.target.value as keyof typeof PRESET_VISITORS)}
            >
              {Object.keys(PRESET_VISITORS).map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Tone
            <select
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={tone}
              onChange={(event) => setTone(event.target.value as "Professional" | "Playful")}
            >
              <option>Professional</option>
              <option>Playful</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Length
            <select
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={length}
              onChange={(event) => setLength(event.target.value as "Short" | "Detailed")}
            >
              <option>Short</option>
              <option>Detailed</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Emphasis
            <select
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={emphasis}
              onChange={(event) => setEmphasis(event.target.value as "Urgency" | "Trust")}
            >
              <option>Urgency</option>
              <option>Trust</option>
            </select>
          </label>
        </section>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => void previewVariant()}
            className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
          >
            {isLoading ? "Generating..." : "Preview"}
          </button>
          <Link
            href="/"
            className="rounded-lg border border-zinc-300 px-4 py-2 font-medium hover:border-zinc-500"
          >
            Back to Landing
          </Link>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {result && (
          <section className="space-y-2 rounded-xl border border-zinc-300 bg-zinc-50 p-5">
            <p className="text-xl font-semibold">{result.headline1}</p>
            <p>{result.headline2}</p>
            <p className="text-sm text-zinc-600">
              usedClaimIds: {result.usedClaimIds.join(", ") || "none"} · attempts: {result.attempts} · fallback:{" "}
              {String(result.isFallback)}
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
