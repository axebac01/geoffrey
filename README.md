\# Geoffrey.ai — GEO Micro SaaS (Improved MVP Plan)

\#\# Goal  
Launch a simple Micro SaaS that:  
1\) Measures AI visibility (mention frequency \+ context)  
2\) Generates concrete GEO improvements (FAQ \+ schema \+ copy)

Target user: small business owners (local \+ service businesses)

\---

\#\# MVP Outputs (what users get)  
\#\#\# 1\) AI Visibility Report  
\- AI Visibility Score (0–100)  
\- Coverage: “Mentioned in X/Y prompts”  
\- Prompt-by-prompt results (collapsed view)  
\- Notes: “Results can vary slightly by model/version”

\#\#\# 2\) GEO Action Pack  
\- Long FAQ (15–20 Qs)  
\- FAQ in HTML \+ Markdown  
\- FAQPage JSON-LD (copy/paste)

\#\#\# 3\) Schema \+ Copy Pack (small but powerful)  
\- Organization / LocalBusiness JSON-LD  
\- AI-friendly About snippet (150–250 words)

\---

\#\# Non-negotiable MVP rules  
\- Two-pass architecture (Responder \+ Judge)  
\- No hallucinated business facts (use Entity Snapshot)  
\- Fixed model settings for stability (low temperature)  
\- Freemium gating from day 1

\---

\#\# Core Concept: Two-Pass Measurement  
\#\#\# Pass 1: Responder  
We ask the model the user’s prompt and capture the raw answer text.

\#\#\# Pass 2: Judge  
We evaluate that answer text against the target company entity.

This avoids contaminating the answer with evaluation instructions.

\---

\#\# Onboarding (simple \+ required inputs)  
\#\#\# Step 1: Company Identity  
\- Company name  
\- Website (optional but recommended)  
\- Country \+ city/region

\#\#\# Step 2: Entity Snapshot (anti-hallucination)  
User enters 3–8 bullets:  
\- Services offered  
\- Areas served  
\- Any trust signals (years, certifications) OPTIONAL

Example:  
\- “Car dealership in Malmö”  
\- “Sells used and new cars”  
\- “Offers financing”  
\- “Serves Skåne”

\#\#\# Step 3: Custom Prompts (optional, encouraged)  
\- Up to 5 prompts (Free: 1–2)  
\- Show templates and examples  
\- Validator: max length \+ “real question” format

\---

\#\# Prompt Packs  
\#\#\# A) Standard prompts (always run)  
1\. “List companies in \[INDUSTRY\] in \[COUNTRY\].”  
2\. “Recommend a \[INDUSTRY\] company in \[CITY\].”  
3\. “Best \[INDUSTRY\] companies for small businesses in \[COUNTRY\].”  
4\. “Who offers \[SERVICE\] in \[CITY\]?”  
5\. “What companies specialize in \[SERVICE\] in \[COUNTRY\]?”

\#\#\# B) User prompts  
Up to 5\. Weighted in scoring.

\---

\#\# Mention Detection (MVP)  
\#\#\# Entity normalization  
Create aliases:  
\- Exact company name  
\- Lowercase  
\- Remove “AB / Ltd / LLC”  
\- Domain root (example.com)  
\- Brand name (if provided)

\#\#\# Detection method  
1\) Deterministic match (string/alias)  
2\) Judge LLM classifies:  
\- direct / alias / implied / none  
\- rank position when list exists  
\- industry \+ location match

\---

\#\# Scoring (stable \+ explainable)  
\#\#\# Base score from standard prompts (max 80\)  
For each standard prompt:  
\- Mentioned: \+10  
\- Mentioned early (rank 1–3): \+6  
\- Industry match: \+2  
\- Location match: \+2  
(Max 20 per prompt if you run 4 prompts; adjust weights to total 80\)

\#\#\# Custom prompts bonus (max 20\)  
Each user prompt:  
\- Mentioned: \+5  
\- Mentioned early: \+3  
\- Context match: \+2

Final score \= base \+ bonus (0–100)

Also show:  
\- Coverage: X/Y prompts mentioned

\---

\#\# GEO Generator (Actions)  
\#\#\# Outputs  
1\) FAQ HTML  
2\) FAQ Markdown  
3\) FAQPage JSON-LD  
4\) About snippet  
5\) Organization/LocalBusiness JSON-LD

\#\#\# Hard rule  
Use ONLY Entity Snapshot facts.  
If missing, respond generically and safely.

\---

\#\# Tech Stack (MVP-friendly)  
\#\#\# UI  
Lovable  
\- Landing page  
\- Onboarding  
\- Results dashboard  
\- Downloads/copy buttons  
\- Upgrade CTA

\#\#\# Backend  
Google Antigravity  
\- Workflow: AnalyzeVisibility  
\- Workflow: GenerateGEOAssets  
\- Store results in a simple DB

\#\#\# APIs  
\- OpenAI (required for MVP)  
\- Gemini (optional post-launch)

\#\#\# Data storage  
Store:  
\- user id/email  
\- entity snapshot  
\- prompts  
\- results (answer text \+ judge JSON)  
\- generated assets  
\- timestamps

\---

\#\# Build Order (do exactly this)  
\#\#\# Phase 1 — Prompt \+ Judge (core logic)  
1\) Implement Responder call  
2\) Implement Judge call  
3\) Save judge JSON per prompt  
4\) Compute score \+ coverage

\#\#\# Phase 2 — GEO generator  
1\) Generate FAQ (HTML \+ MD)  
2\) Generate FAQ JSON-LD  
3\) Generate About snippet  
4\) Generate Org/LocalBusiness JSON-LD

\#\#\# Phase 3 — UI  
1\) Onboarding (3 steps)  
2\) “Analyze” job status  
3\) Results dashboard  
4\) Export/copy controls

\#\#\# Phase 4 — Payments (Stripe)  
\- Free: 1 analysis, 1 FAQ, 2 custom prompts  
\- Pro: unlimited analyses, 5 custom prompts, exports, history

\---

\#\# QA checklist (before launch)  
\- Run 10 real companies  
\- Ensure:  
  \- No hallucinated facts in FAQ  
  \- JSON-LD validates  
  \- Score is stable across runs  
  \- Results are understandable

\---

\#\# Post-MVP (only after launch)  
\- Multi-model comparisons (Gemini, Perplexity)  
\- Scheduled re-checks  
\- Competitor benchmarking  
\- CMS plugins (WordPress/Webflow)  
\- Agency dashboards

