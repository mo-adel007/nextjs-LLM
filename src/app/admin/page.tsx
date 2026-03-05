"use client";

import { useState } from 'react';
import { DecideResponse } from '@/lib/types';  // Import typed response — no `any` usage

// Preset visitor profiles per the Architecture Document (Section 4.2).
// Each preset represents a different visitor persona to test LLM behaviour.
// "Startup" is specifically designed to trigger the hallucination → retry flow.
const PRESET_VISITORS = [
  { id: 'visitor-egypt', name: 'Mobile Egypt', context: { visitorProfile: 'Mobile Egypt' } },
  { id: 'visitor-google', name: 'Google Visitor', context: { visitorProfile: 'Google Visitor' } },
  { id: 'visitor-startup', name: 'Startup (Forces Retry)', context: { visitorProfile: 'Startup' } },
  { id: 'visitor-default', name: 'Default (General)', context: { visitorProfile: 'General Visitor' } }
];

// Admin Preview Page — the control panel for testing the decision engine.
// Allows selecting visitor presets and tweaking all three demo rules (tone, length, emphasis).
// Displays both the JSON response AND a human-friendly summary of what happened.
export default function AdminPreviewPage() {
  // Control panel state — all typed as strings, no `any`
  const [visitorId, setVisitorId] = useState<string>(PRESET_VISITORS[0].id);
  const [tone, setTone] = useState<string>('Professional');       // Tone rule state
  const [length, setLength] = useState<string>('Short');           // Length rule state
  const [emphasis, setEmphasis] = useState<string>('Trust');       // Emphasis rule state

  // API call state — typed with DecideResponse instead of `any`
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DecideResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);   // Track connection errors separately

  // Fires when the user clicks "Run Decision Engine"
  const handlePreview = async () => {
    setLoading(true);                                              // Start loading spinner
    setResult(null);                                               // Clear previous result
    setApiError(null);                                             // Clear previous error

    // Look up the selected visitor preset by ID
    const selectedVisitor = PRESET_VISITORS.find(v => v.id === visitorId);

    try {
      // Call the unified POST /api/decide endpoint
      const res = await fetch('/api/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorProfile: selectedVisitor?.context.visitorProfile,  // Selected visitor persona
          rules: { tone, length, emphasis }                         // All three demo rules
        })
      });

      const data: DecideResponse = await res.json();               // Parse the typed response
      setResult(data);                                             // Store the result for rendering
    } catch (error) {
      console.error('Preview fetching failed', error);
      setApiError('Failed to connect to the API. Is the server running?');
    } finally {
      setLoading(false);                                           // Stop spinner in all cases
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Page Header */}
        <header className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Decisioning API: Admin Preview</h1>
              <p className="text-gray-500 mt-2">
                Simulate visitor contexts, tweak rules, and observe the LLM validation boundary in real time.
              </p>
            </div>
            <a href="/" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              ← Back to Landing Page
            </a>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* ======= LEFT COLUMN: Control Panel ======= */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold mb-6">Targeting Constraints</h2>

            <div className="space-y-5">

              {/* Visitor Profile Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preset Visitor Profile</label>
                <select
                  className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
                  value={visitorId}
                  onChange={(e) => setVisitorId(e.target.value)}
                >
                  {PRESET_VISITORS.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              {/* Demo Rules Section */}
              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Demo Rules (Prompt Tweaks)
                </h3>

                <div className="space-y-4">
                  {/* Tone Rule */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
                    <div className="flex gap-4">
                      {['Professional', 'Playful'].map(t => (
                        <label key={t} className="flex items-center gap-2 text-sm">
                          <input type="radio" name="tone" checked={tone === t} onChange={() => setTone(t)} className="text-blue-600 focus:ring-blue-500" />
                          {t}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Length Rule */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Length</label>
                    <div className="flex gap-4">
                      {['Short', 'Detailed'].map(l => (
                        <label key={l} className="flex items-center gap-2 text-sm">
                          <input type="radio" name="length" checked={length === l} onChange={() => setLength(l)} className="text-blue-600 focus:ring-blue-500" />
                          {l}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Emphasis Rule */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Emphasis / Focus</label>
                    <div className="flex gap-4">
                      {['Trust', 'Urgency'].map(e => (
                        <label key={e} className="flex items-center gap-2 text-sm">
                          <input type="radio" name="emphasis" checked={emphasis === e} onChange={() => setEmphasis(e)} className="text-blue-600 focus:ring-blue-500" />
                          {e}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handlePreview}
                disabled={loading}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:bg-blue-300"
              >
                {loading ? 'Evaluating Rules & Generating...' : 'Run Decision Engine'}
              </button>
            </div>
          </div>

          {/* ======= RIGHT COLUMN: Results ======= */}
          <div className="space-y-6">

            {/* Friendly Summary Card — Human-readable explanation */}
            {result?.friendlySummary && (
              <div className={`p-5 rounded-xl border ${result.isFallback
                  ? 'bg-red-50 border-red-200'
                  : 'bg-green-50 border-green-200'
                }`}>
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-2 ${result.isFallback ? 'text-red-600' : 'text-green-700'}`}>
                  {result.isFallback ? 'Fallback Triggered' : 'Generation Successful'}
                </h3>
                <p className={`text-sm leading-relaxed ${result.isFallback ? 'text-red-800' : 'text-green-800'}`}>
                  {result.friendlySummary}
                </p>
              </div>
            )}

            {/* Claims Detail Card — Shows which claim IDs + texts were used */}
            {result && !apiError && (
              <div className="bg-white p-5 rounded-xl border border-gray-200">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">
                  Claims Referenced
                </h3>
                {result.usedClaimsDetail && result.usedClaimsDetail.length > 0 ? (
                  <ul className="space-y-2">
                    {result.usedClaimsDetail.map((claim) => (
                      <li key={claim.id} className="flex items-start gap-2 text-sm">
                        <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded shrink-0 mt-0.5">
                          {claim.id}
                        </span>
                        <span className="text-gray-700">{claim.text}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400 italic">No claims used — fallback or bypass.</p>
                )}
              </div>
            )}

            {/* Connection Error */}
            {apiError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                {apiError}
              </div>
            )}

            {/* JSON Output + Debug Trace */}
            <div className="bg-gray-900 rounded-xl shadow-lg p-6 flex flex-col text-gray-100 overflow-hidden">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400"></span> Raw JSON Output
              </h2>

              <div className="flex-1 bg-black/40 rounded-lg p-4 font-mono text-sm overflow-y-auto border border-gray-700 max-h-96">
                {loading ? (
                  <div className="text-gray-400 animate-pulse">Running boundary validations...</div>
                ) : result ? (
                  <div>
                    {/* Status Badge */}
                    <div className={`mb-4 inline-block px-3 py-1 rounded text-xs font-bold ${
                      result.isFallback
                        ? 'bg-red-900/50 text-red-400 border border-red-800'
                        : 'bg-green-900/50 text-green-400 border border-green-800'
                    }`}>
                      {result.isFallback ? 'FALLBACK TRIGGERED' : 'VALIDATION PASSED'}
                    </div>

                    {/* Structured JSON Preview */}
                    <pre className="whitespace-pre-wrap">{JSON.stringify({
                      headline1: result.headline1,
                      headline2: result.headline2,
                      usedClaimIds: result.usedClaimIds,
                      isFallback: result.isFallback
                    }, null, 2)}</pre>

                    {/* Debug Trace (collapsible via scroll) */}
                    {result.debugTrace && (
                      <div className="mt-8 pt-4 border-t border-gray-700">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">
                          Debug Execution Trace
                        </h3>
                        <pre className="text-xs text-gray-400 whitespace-pre-wrap bg-gray-950 p-3 rounded border border-gray-800">
                          {JSON.stringify(result.debugTrace, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 h-full flex items-center justify-center italic py-12">
                    Run the engine to preview the generated landing page payload.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
