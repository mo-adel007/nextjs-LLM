import { NextResponse } from "next/server";

import { getAllowedClaims } from "@/lib/claims";
import { generateSafeCopy } from "@/lib/llm";
import type { DecideRequest, DemoRules, VisitorContext } from "@/lib/types";

// Safe fallback payload used on unrecoverable handler errors.
const FATAL_FALLBACK = {
  headline1: "Welcome to our platform.",
  headline2: "Discover what we can do for you.",
  usedClaimIds: [],
  isFallback: true,
  attempts: 0,
};

// Narrows unknown values to plain object records.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// Parses the visitor object from incoming JSON and accepts both modern + legacy shapes.
function parseVisitor(body: Record<string, unknown>): VisitorContext | null {
  const candidate = isRecord(body.visitor)
    ? body.visitor
    : typeof body.visitorProfile === "string"
      ? { visitorProfile: body.visitorProfile }
      : null;

  if (!candidate) {
    return null;
  }

  return {
    visitorProfile:
      typeof candidate.visitorProfile === "string" ? candidate.visitorProfile : undefined,
    country: typeof candidate.country === "string" ? candidate.country : undefined,
    deviceType:
      candidate.deviceType === "mobile" || candidate.deviceType === "desktop"
        ? candidate.deviceType
        : undefined,
    referrerDomain:
      typeof candidate.referrerDomain === "string" ? candidate.referrerDomain : undefined,
  };
}

// Parses optional rules from incoming JSON.
function parseRules(body: Record<string, unknown>): DemoRules | undefined {
  const candidate = isRecord(body.rules) ? body.rules : undefined;

  if (!candidate) {
    return undefined;
  }

  return {
    tone:
      candidate.tone === "Professional" || candidate.tone === "Playful"
        ? candidate.tone
        : undefined,
    length:
      candidate.length === "Short" || candidate.length === "Detailed"
        ? candidate.length
        : undefined,
    emphasis:
      candidate.emphasis === "Urgency" || candidate.emphasis === "Trust"
        ? candidate.emphasis
        : undefined,
  };
}

// Validates and normalizes request JSON into the internal DecideRequest contract.
function parseDecideRequest(value: unknown): DecideRequest | null {
  if (!isRecord(value)) {
    return null;
  }

  const visitor = parseVisitor(value);

  if (!visitor) {
    return null;
  }

  return {
    visitor,
    rules: parseRules(value),
  };
}

// Handles POST /api/decide for safe, constrained LLM generation.
export async function POST(request: Request) {
  try {
    // Parse and validate request JSON into our typed contract.
    const body = parseDecideRequest(await request.json());

    // Reject malformed payloads early.
    if (!body) {
      return NextResponse.json(
        {
          error:
            "Invalid request. Provide either 'visitor' object or 'visitorProfile' string.",
        },
        { status: 400 },
      );
    }

    // Fetch approved claims from the mock source.
    const allowedClaims = await getAllowedClaims();
    // Run generation orchestration + validation boundary.
    const result = await generateSafeCopy(body, allowedClaims);

    // Return safe result to the frontend.
    return NextResponse.json(result);
  } catch (error) {
    // Handle unexpected runtime failures with safe fallback response.
    console.error("[decide] fatal error", error);
    return NextResponse.json(FATAL_FALLBACK, { status: 500 });
  }
}
