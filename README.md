# Next.js Demo UI + LLM-Native Copy Assistant

**Technical Architecture & Planning**

**Version:** 1.0\
**Date:** 4 March 2026\
**Status:** Pre-Implementation Review

------------------------------------------------------------------------

# Executive Summary

This project demonstrates a **safe architecture for AI-generated
marketing copy** using a constrained Large Language Model (LLM).

The goal is to answer the question:

> "This visitor just opened the page. Can we generate a highly relevant
> headline using an LLM while guaranteeing that the text only contains
> facts we know are true?"

Instead of allowing an LLM to generate unrestricted text (which may
hallucinate), this system **strictly limits the model to a predefined
set of approved claims**.

The model must: 1. Generate headlines 2. Explicitly cite which claims it
used

A validation boundary ensures the output is safe before it reaches the
frontend.

This pattern enables **enterprise-grade AI personalisation** with strict
safety guarantees.

------------------------------------------------------------------------

# Constrained LLM Generation

## Runtime Flow

    User opens website
            ↓
    Frontend sends visitor context to API
            ↓
    POST /api/decide
            ↓
    Backend loads allowedClaims
            ↓
    LLM generates JSON response
            ↓
    Validation boundary checks usedClaimIds
            ↓
    If valid → return headlines
    If invalid → retry or fallback
            ↓
    Frontend renders safe copy

------------------------------------------------------------------------

## Why This Pattern Exists

  Use Case           Benefit
  ------------------ --------------------------------------------------
  Brand Safety       Prevents LLM from inventing nonexistent features
  Legal Compliance   Only legally approved claims can appear
  Personalisation    Allows infinite variations without infinite risk

------------------------------------------------------------------------

# Key Concepts

## Allowed Claims

An **allowed claim** is a piece of pre-approved information the model is
permitted to reference.

Example:

  Claim ID         Text
  ---------------- --------------------------------------------
  claim-speed      Our product is 10x faster than competitors
  claim-price      Starts at \$9/month
  claim-security   SOC2 Type II Certified

------------------------------------------------------------------------

## Model Output Schema

The LLM must return **strict JSON**, not free text.

Example output:

``` json
{
  "headline1": "Experience 10x faster performance today.",
  "headline2": "Secure your data with SOC2 compliance.",
  "usedClaimIds": ["claim-speed", "claim-security"]
}
```

------------------------------------------------------------------------

## Validation Boundary

Before returning LLM output to the UI, the backend validates the result.

If the model references **any claim not present in `allowedClaims`**,
the response is rejected.

Example invalid output:

``` json
{
  "usedClaimIds": ["claim-speed", "claim-fake"]
}
```

Because `claim-fake` does not exist, the payload is rejected.

------------------------------------------------------------------------

# System Architecture

The architecture isolates the LLM behind a strict validation boundary.

                         NEXT.JS BACKEND
    ┌──────────────────────────────────────────────────┐
    │                                                  │
    │ POST /decide                                     │
    │        │                                         │
    │        ▼                                         │
    │   allowedClaims()                                │
    │        │                                         │
    │        ▼                                         │
    │     LLM Client                                   │
    │   (prompt generation)                            │
    │        │                                         │
    │        ▼                                         │
    │   Validation Boundary                            │
    │   usedClaimIds ⊆ allowedClaims                   │
    │        │                                         │
    │        ▼                                         │
    │  Return Valid JSON OR Retry/Fallback             │
    │                                                  │
    └──────────────────────────────────────────────────┘

------------------------------------------------------------------------

# API Endpoints

## POST `/api/decide`

Generates safe personalised copy based on visitor context.

### Request Example

``` json
{
  "visitorProfile": "New Visitor",
  "rules": {
    "tone": "Professional",
    "length": "Short",
    "emphasis": "Trust"
  }
}
```

### Response

``` json
{
  "headline1": "Enterprise-grade security you can trust.",
  "headline2": "Protect your data with SOC2 compliance.",
  "usedClaimIds": ["claim-security"],
  "isFallback": false
}
```

------------------------------------------------------------------------

# Validation Boundary

## Subset Rule

    usedClaimIds ⊆ allowedClaims

If any claim in `usedClaimIds` is not present in `allowedClaims`, the
response is rejected.

------------------------------------------------------------------------

# Resilience Strategy

### Attempt 1

Call LLM → Validate

### Attempt 2

Retry LLM → Validate

### Fallback

Return safe default content

Example fallback:

``` json
{
  "headline1": "Welcome to our platform.",
  "headline2": "Discover what we can do for you.",
  "usedClaimIds": [],
  "isFallback": true
}
```

------------------------------------------------------------------------

# Logging & Safety

All LLM interactions are logged to the server console.

Each trace includes:

-   allowed claims sent to the model
-   raw LLM output
-   validation result
-   retry attempts

If validation fails:

1.  The system retries once
2.  If retry fails, it falls back to safe default content

This ensures the UI **never renders unsafe AI output**.

------------------------------------------------------------------------

# Technology Stack

  Layer             Technology                   Purpose
  ----------------- ---------------------------- ----------------------------
  Framework         Next.js 14+                  Full-stack React framework
  Language          TypeScript 5                 Type safety
  Styling           Tailwind CSS / CSS Modules   Fast UI iteration
  LLM Integration   Vendor SDK (OpenAI etc.)     Model interaction

------------------------------------------------------------------------

# Project Structure

    llm-copy-demo
    │
    ├── app
    │   ├── page.tsx
    │   ├── admin
    │   │   └── page.tsx
    │   └── api
    │       └── decide
    │           └── route.ts
    │
    ├── lib
    │   ├── llm.ts
    │   ├── claims.ts
    │   └── types.ts
    │
    ├── package.json
    ├── tsconfig.json
    └── README.md

------------------------------------------------------------------------

Prepared for technical discovery and implementation review --- March
2026
