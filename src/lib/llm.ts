// src/lib/llm.ts
// This module contains the LLM simulation engine and the validation boundary.
// In a production system, `generateCopy` would call an LLM API (OpenAI, Anthropic, etc.).
// For this demo, it simulates structured JSON output, including deliberate hallucination
// scenarios to demonstrate the retry/fallback safety mechanism.

import { AllowedClaim } from './claims';   // Import the claim type for type-safe parameter passing
import { LLMOutput } from './types';       // Import the strict output schema the LLM must conform to

/**
 * Simulates an LLM generation call and returns structured JSON output.
 *
 * This function reacts to ALL three demo rules (tone, length, emphasis)
 * and produces different claim selections and headlines accordingly.
 * The `isRetry` flag indicates the system is retrying after a validation failure.
 * `failedClaimIds` provides feedback about which claims were invalid on the first attempt —
 * in a real LLM integration, this would be appended to the prompt so the model can self-correct.
 *
 * @param visitorProfile - The visitor persona string (e.g. "Startup", "Mobile Egypt")
 * @param rules          - The demo rule overrides from the admin panel
 * @param allowedClaims  - The full set of claims the LLM is permitted to use
 * @param isRetry        - Whether this is a retry attempt after validation failure
 * @param failedClaimIds - The specific claim IDs that failed validation (passed on retry)
 */
export async function generateCopy(
  visitorProfile: string,
  rules: { tone?: string; length?: string; emphasis?: string },
  allowedClaims: AllowedClaim[],
  isRetry: boolean = false,
  failedClaimIds: string[] = []
): Promise<LLMOutput> {

  // Simulate realistic network latency (500ms–1000ms) as a real API call would have
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

  // --- HALLUCINATION DEMO ---
  // When the visitor profile is "Startup" and this is the first attempt,
  // deliberately return an invalid claim ID ("claim-ai-fake") to trigger
  // the validation boundary and demonstrate the retry mechanism.
  // On retry, the model "self-corrects" and returns only valid claims.
  if (visitorProfile === 'Startup' && !isRetry) {
    return {
      headline1: 'Build 10x faster with AI-powered tools.',                  // Uses claim-speed language
      headline2: 'The ultimate platform for startups scaling quickly.',       // Uses a hallucinated claim
      usedClaimIds: ['claim-speed', 'claim-ai-fake']                         // 'claim-ai-fake' will FAIL validation
    };
  }

  // --- RULE-DRIVEN GENERATION ---
  // Extract individual rule values with sensible defaults
  const tone = rules?.tone ?? 'Professional';       // Default tone is Professional
  const length = rules?.length ?? 'Short';           // Default length is Short
  const emphasis = rules?.emphasis ?? 'Trust';       // Default emphasis is Trust

  // Start with base claims — every generation uses at least the speed claim
  let claims: string[] = ['claim-speed'];
  // Initialise headline placeholders that will be overridden by rule logic
  let h1 = 'Experience incredible performance today.';
  let h2 = 'A reliable platform for your needs.';

  // --- EMPHASIS RULE ---
  // Emphasis determines WHICH claims get prioritised in the output.
  // "Trust" → security + support claims | "Urgency" → speed + price claims
  if (emphasis === 'Trust') {
    claims = ['claim-security', 'claim-support'];     // Trust-focused claim selection
    h1 = 'Enterprise-grade security you can trust.';  // Trust-oriented headline
    h2 = '24/7 support to keep your business running.'; // Support reinforcement
  } else if (emphasis === 'Urgency') {
    claims = ['claim-speed', 'claim-price'];           // Urgency-focused claim selection
    h1 = 'Don\'t wait — 10x faster performance awaits.'; // Urgency-oriented headline
    h2 = 'Starting at just $9/month. Act now.';           // Price urgency reinforcement
  }

  // --- TONE RULE ---
  // Tone modifies the voice/style of the headlines without changing claim selection.
  // "Playful" → casual, emoji-friendly | "Professional" → formal, enterprise-ready
  if (tone === 'Playful') {
    h1 = emphasis === 'Trust'
      ? 'We\'ve got your back — literally certified for it! 🛡️'   // Playful trust headline
      : 'Zoom past the competition! 🚀';                           // Playful urgency headline
    h2 = emphasis === 'Trust'
      ? 'Sleep well knowing our support team never sleeps.'         // Playful support angle
      : 'Seriously, it\'s 10x faster. And only $9/month.';         // Playful price angle
  }
  // Professional tone uses the headlines already set by emphasis logic (no override needed)

  // --- VISITOR PROFILE OVERRIDES ---
  // Specific visitor personas trigger targeted claim additions.
  // "Mobile Egypt" or any mobile visitor → add mobile claim
  if (visitorProfile === 'Mobile Egypt' || visitorProfile.toLowerCase().includes('mobile')) {
    h1 = tone === 'Playful'
      ? 'Mobile-first? We built this just for you. 📱'            // Playful mobile headline
      : 'The best mobile experience — iOS and Android.';          // Professional mobile headline
    claims.push('claim-mobile');                                    // Append mobile claim to selection
  }

  // "Google Visitor" → came from search, emphasise speed + price (conversion-focused)
  if (visitorProfile === 'Google Visitor') {
    h1 = tone === 'Playful'
      ? 'You searched. We delivered. 10x faster. 🔍'              // Playful search-referral headline
      : 'The performance solution you\'ve been searching for.';   // Professional search-referral headline
    h2 = 'Starting at $9/month — no hidden fees.';                // Price transparency for search visitors
    claims = ['claim-speed', 'claim-price'];                       // Search visitors care about value
  }

  // --- LENGTH RULE ---
  // "Detailed" appends extra context to headlines for richer copy.
  // "Short" uses headlines as-is (already concise by default).
  if (length === 'Detailed') {
    h1 = h1 + ' Backed by enterprise infrastructure.';            // Append detail to primary headline
    h2 = h2 + ' Trusted by teams in over 40 countries.';          // Append social proof to subheading
  }

  // Return the structured JSON that matches the LLMOutput schema
  return {
    headline1: h1,           // Final primary headline (influenced by tone + emphasis + length + visitor)
    headline2: h2,           // Final secondary headline (influenced by same rule matrix)
    usedClaimIds: claims     // The claim IDs the model declares it used — validated by the boundary
  };
}

/**
 * The Validation Boundary — the core safety mechanism of the entire architecture.
 *
 * Implements the strict subset rule: usedClaimIds ⊆ allowedClaims
 * Every single claim ID the LLM returns must exist in the allowed claims list.
 * If even ONE claim is missing, the entire payload is rejected as unsafe.
 *
 * Returns an object with the validation result AND the specific invalid claim IDs
 * (if any), so the retry mechanism can provide targeted feedback to the model.
 *
 * @param output        - The raw LLM output to validate
 * @param allowedClaims - The authoritative list of permitted claims
 * @returns {{ valid: boolean, invalidClaimIds: string[] }}
 */
export function validateLLMOutput(
  output: LLMOutput,
  allowedClaims: AllowedClaim[]
): { valid: boolean; invalidClaimIds: string[] } {
  // Build a Set of allowed IDs for O(1) lookup during validation
  const allowedIds = new Set(allowedClaims.map(c => c.id));

  // Collect every used claim ID that does NOT exist in the allowed set
  const invalidClaimIds = output.usedClaimIds.filter(id => !allowedIds.has(id));

  // If any invalid claims found, the output is toxic — return false with details
  return {
    valid: invalidClaimIds.length === 0,   // true only if EVERY used claim is allowed
    invalidClaimIds                         // Empty array on success, populated on failure
  };
}
