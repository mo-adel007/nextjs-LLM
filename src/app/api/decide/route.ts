// src/app/api/decide/route.ts
// POST /api/decide — The unified decision endpoint.
// This is the orchestrator that ties together: claim loading, LLM generation,
// validation boundary enforcement, retry logic, fallback, and server-side logging.
// Every step is logged to the server console for full observability (AC-7).

import { NextRequest, NextResponse } from 'next/server';        // Next.js request/response types
import { getAllowedClaims } from '@/lib/claims';                 // The mock claim database
import { generateCopy, validateLLMOutput } from '@/lib/llm';    // LLM simulation + validation boundary
import { DecideRequestBody, DecideResponse, LLMOutput, TraceEntry, ClaimDetail } from '@/lib/types'; // Strict types

/**
 * Builds a human-readable summary explaining what the decision engine did.
 * This gives non-technical users (marketers, reviewers) a plain-English account
 * of the generation outcome — whether it succeeded, retried, or fell back.
 *
 * @param isFallback     - Whether fallback defaults were used
 * @param usedClaimIds   - The claim IDs present in the final output
 * @param wasRetried     - Whether the system had to retry after a validation failure
 * @param visitorProfile - The visitor profile that triggered this generation
 */
function buildFriendlySummary(
  isFallback: boolean,
  usedClaimIds: string[],
  wasRetried: boolean,
  visitorProfile: string
): string {
  // Fallback case — LLM failed twice, safe defaults rendered
  if (isFallback) {
    return `The AI model failed to produce safe copy for the "${visitorProfile}" visitor profile after 2 attempts. ` +
      `The system returned safe default headlines to protect brand integrity. No claims were used.`;
  }
  // Successful generation with retry — model self-corrected
  if (wasRetried) {
    return `The AI model initially produced invalid claims for the "${visitorProfile}" visitor. ` +
      `After an automatic retry with error feedback, it self-corrected and generated safe headlines ` +
      `using ${usedClaimIds.length} approved claim(s): ${usedClaimIds.join(', ')}.`;
  }
  // Clean first-attempt success
  return `The AI model successfully generated personalised headlines for the "${visitorProfile}" visitor ` +
    `on the first attempt, using ${usedClaimIds.length} approved claim(s): ${usedClaimIds.join(', ')}. ` +
    `All claims passed the validation boundary check.`;
}

// --- POST Handler ---
// Accepts a visitor profile and optional rules, returns safe LLM-generated copy.
export async function POST(req: NextRequest) {
  try {
    // --- Step 0: Parse and validate the request body ---
    const body: DecideRequestBody = await req.json();         // Parse incoming JSON payload
    const { visitorProfile, rules } = body;                   // Destructure the two top-level fields

    // Input validation — visitorProfile is required per the API contract
    if (!visitorProfile || typeof visitorProfile !== 'string' || visitorProfile.trim() === '') {
      return NextResponse.json(                               // Return a 400 for malformed requests
        { error: 'Missing or invalid "visitorProfile" field. Must be a non-empty string.' },
        { status: 400 }
      );
    }

    // --- Step 1: Load allowed claims ---
    const allowedClaims = getAllowedClaims();                  // Fetch all pre-approved claims
    const allowedClaimIds = allowedClaims.map(c => c.id);     // Extract just the IDs for logging

    // Server-side trace log: what claims are available for this request
    console.log('[DECIDE] === New Request ===');
    console.log('[DECIDE] Visitor Profile:', visitorProfile);
    console.log('[DECIDE] Rules:', JSON.stringify(rules ?? {}));
    console.log('[DECIDE] Allowed Claim IDs:', allowedClaimIds);

    // Initialise the structured debug trace for the response payload
    const debugTrace: TraceEntry[] = [];
    debugTrace.push({                                          // Record the initial state
      step: 'START',
      visitorProfile,
      rules,
      allowedClaimIds
    });

    // Track whether we needed to retry (used for the friendly summary)
    let wasRetried = false;

    // --- Step 2: Attempt 1 — Generate copy via LLM ---
    let llmOutput: LLMOutput = await generateCopy(            // Call the LLM simulation
      visitorProfile,
      rules ?? {},                                             // Default to empty rules if not provided
      allowedClaims,
      false                                                    // isRetry = false (first attempt)
    );
    debugTrace.push({ step: 'Attempt 1 — LLM Output', output: llmOutput }); // Log raw output
    console.log('[DECIDE] Attempt 1 — Raw LLM Output:', JSON.stringify(llmOutput));

    // --- Step 3: Validate Attempt 1 (The Boundary Check: usedClaimIds ⊆ allowedClaims) ---
    let validation = validateLLMOutput(llmOutput, allowedClaims);

    if (!validation.valid) {
      // Validation FAILED — log which claims were invalid
      console.log('[DECIDE] Attempt 1 — VALIDATION FAILED. Invalid claims:', validation.invalidClaimIds);
      debugTrace.push({
        step: 'Attempt 1 — Validation',
        status: 'FAILED — Toxic/hallucinated claims detected',
        failedClaimIds: validation.invalidClaimIds               // Record exactly which claims were bad
      });

      // --- Step 4: Attempt 2 — Retry with error feedback ---
      wasRetried = true;                                         // Mark that we're retrying
      llmOutput = await generateCopy(
        visitorProfile,
        rules ?? {},
        allowedClaims,
        true,                                                    // isRetry = true (second attempt)
        validation.invalidClaimIds                               // Pass the invalid claims as feedback
      );
      debugTrace.push({ step: 'Attempt 2 — LLM Output (Retry)', output: llmOutput });
      console.log('[DECIDE] Attempt 2 — Raw LLM Output:', JSON.stringify(llmOutput));

      // Validate Attempt 2
      validation = validateLLMOutput(llmOutput, allowedClaims);
    }

    // --- Step 5: Build final response — Success or Fallback ---
    let finalResponse: DecideResponse;

    if (validation.valid) {
      // SUCCESS — all claims are valid, safe to return to the frontend
      console.log('[DECIDE] Validation PASSED. Used claims:', llmOutput.usedClaimIds);
      debugTrace.push({ step: 'Final Validation', status: 'PASSED' });

      // Enrich used claim IDs with their full text for UI display
      const usedClaimsDetail: ClaimDetail[] = llmOutput.usedClaimIds.map(id => {
        const claim = allowedClaims.find(c => c.id === id);     // Look up the claim text by ID
        return { id, text: claim?.text ?? 'Unknown claim' };    // Fallback text if somehow missing
      });

      finalResponse = {
        headline1: llmOutput.headline1,                          // Primary safe headline
        headline2: llmOutput.headline2,                          // Secondary safe headline
        usedClaimIds: llmOutput.usedClaimIds,                    // Raw claim IDs for programmatic use
        usedClaimsDetail,                                        // Enriched claims with text for UI
        isFallback: false,                                       // Not a fallback — LLM succeeded
        friendlySummary: buildFriendlySummary(false, llmOutput.usedClaimIds, wasRetried, visitorProfile),
        debugTrace
      };
    } else {
      // FALLBACK — both attempts failed validation, return safe defaults
      console.log('[DECIDE] Attempt 2 — VALIDATION FAILED. Cascading to SAFE FALLBACK.');
      console.log('[DECIDE] Invalid claims on retry:', validation.invalidClaimIds);
      debugTrace.push({
        step: 'Final Validation',
        status: 'FAILED — Cascading to safe fallback',
        failedClaimIds: validation.invalidClaimIds
      });

      finalResponse = {
        headline1: 'Welcome to our platform.',                   // Safe default headline
        headline2: 'Discover what we can do for you.',           // Safe default subheading
        usedClaimIds: [],                                        // No claims — bypassed LLM entirely
        usedClaimsDetail: [],                                    // No claim details on fallback
        isFallback: true,                                        // Flagged as fallback for the UI
        friendlySummary: buildFriendlySummary(true, [], wasRetried, visitorProfile),
        debugTrace
      };
    }

    console.log('[DECIDE] === Response Sent ===');               // Mark the end of this request trace
    return NextResponse.json(finalResponse, { status: 200 });   // Return the full response payload

  } catch (error: unknown) {
    // --- Fatal error handler — ensures the UI never breaks ---
    const message = error instanceof Error ? error.message : 'Unknown error'; // Safe error extraction
    console.error('[DECIDE] FATAL EXCEPTION:', message);         // Log the crash to server console

    // Return a safe fallback even on unhandled exceptions
    const fallbackResponse: DecideResponse = {
      headline1: 'Welcome to our platform.',
      headline2: 'Discover what we can do for you.',
      usedClaimIds: [],
      usedClaimsDetail: [],
      isFallback: true,
      friendlySummary: 'A server error occurred during generation. Safe default content was returned to protect the user experience.',
      debugTrace: [{ step: 'FATAL EXCEPTION', error: message }]
    };
    return NextResponse.json(fallbackResponse, { status: 200 }); // Still 200 — UI must never break
  }
}
