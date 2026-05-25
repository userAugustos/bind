# Bind Feature Plan

Bind is an AI-powered commercial insurance review workspace for B2B insurance workflows.

The product is designed to help a commercial insurance team answer one central question:

> The client needs to contract or renew commercial insurance. Do the received options satisfy the requirements, and which option should the team recommend?

The user may be a broker, procurement team, account manager, or commercial insurance team member. The plan should not force the product into one of those personas unless a feature requires it.

This document is a living feature plan. It describes product capabilities, feature behavior, data contracts, implementation options, and decisions made during planning. It is not a UI plan and it is not limited to an MVP.

## Implementation Progress

Branch: `feat/review-case-foundation` — PR #1.
Branch: `feat/ai-document-analysis` — PR #2 (targets `feat/review-case-foundation`).
Branch: `feat/policy-check` — PR #3 (targets `feat/ai-document-analysis`).
Branch: `feat/quote-comparison` — PR #4 (targets `feat/policy-check`).

### Status by feature

| Feature                  | Status      | Notes                                                                                                                                                                                   |
| ------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Review Case              | Partial     | Metadata CRUD + status state machine done. Not yet linked to downstream feature outputs.                                                                                                |
| Document Vault           | Partial     | Metadata CRUD done. No PDF upload/storage, no analysis results, several metadata fields deferred.                                                                                       |
| AI Document Analysis     | Partial     | LLM adapter (Mock + Modal), Zod schemas, analysis CRUD, status state machine, 10 e2e tests, simple testing UI. No PDF upload/conversion, no prompt files, no real Modal deployment yet. |
| Policy Check             | Partial     | 5 deterministic checks, CRUD, 9 e2e tests, simple UI. No limit_basis comparison, no page evidence enrichment.                                                                           |
| Quote Comparison         | Partial     | Deterministic engine, recommendation signal, CRUD, 10 e2e tests, simple UI. No multi-run diffing.                                                                                       |
| Proposal / Decision Memo | Not started | —                                                                                                                                                                                       |

### Iteration 1 — done (PR #1)

**Review Case**

- Table `review_cases` with `id`, `case_name`, `client_name`, `status`, `created_at`, `updated_at`.
- CRUD: `POST /cases`, `GET /cases`, `GET /cases/:case_id`, `PATCH /cases/:case_id`, `DELETE /cases/:case_id`.
- Status state machine via `POST /cases/:case_id/transition` with events `submit`, `complete`, `cancel`.
  - Transitions: `draft --submit--> in_review`, `in_review --complete--> completed`, `draft|in_review --cancel--> cancelled`. `completed` and `cancelled` are terminal.
  - Implemented as a plain object map in the service layer (no library), invalid transitions return 400.
- `DELETE /cases/:case_id` returns 409 if the case still has documents.

**Document Vault**

- Table `documents` with `id`, `case_id` (FK, `ON DELETE restrict`), `file_name`, `mime_type`, `document_type`, `analysis_status`, `created_at`.
- CRUD nested under a case: `POST /cases/:case_id/documents`, `GET /cases/:case_id/documents`, `GET /cases/:case_id/documents/:document_id`, `DELETE /cases/:case_id/documents/:document_id`.
- Document/case ownership enforced on single-document GET/DELETE (wrong `case_id` returns 404).
- Document types: `contract_requirements`, `current_policy`, `carrier_quote`, `loss_history`, `other`.
- `analysis_status` enum exists (`pending`, `processing`, `completed`, `failed`) but only `pending` is used; it is a placeholder for the analysis feature.

**Other**

- 27 API e2e tests (Eden Treaty).
- Minimal throwaway UI (`/cases`, `/cases/$caseId`) to exercise the endpoints — list/create cases, transition status, add/delete documents.
- SDK type exports `@bind/api/review-cases` and `@bind/api/documents`.

### Deviations from the plan (iteration 1)

- **Document metadata is a reduced set.** The plan lists `name`, `pages`, `uploaded_by`, `uploaded_at`, `analysis_status`, `last_analyzed_at`, `analysis_version`. Implemented: `file_name` (instead of `name`), `mime_type` (added, not in plan), `analysis_status`, `created_at` (instead of `uploaded_at`). Deferred: `pages`, `uploaded_by`, `last_analyzed_at`, `analysis_version` — these belong with the analysis feature and there is no auth yet for `uploaded_by`.
- **No PDF upload/storage.** Only document metadata is stored; there is no file persistence or PDF-to-image conversion yet.
- **`document_type` is required at creation.** The plan says it is optional (to be inferred by the LLM). Made required for now because there is no analysis/inference path yet.
- **Route validation uses Elysia `t` (Typebox), not Zod.** Matches the existing error-plugin pattern. The plan reserves Zod for AI response payloads — that still applies when the analysis module is built.

### Open decisions for next iteration

1. **PATCH on terminal cases.** Editing `case_name`/`client_name` is currently allowed on `completed`/`cancelled` cases. Decide whether to restrict.
2. **Document delete vs. case delete.** Case delete is blocked (409) while documents exist; a case must be emptied first. Confirm this is the desired UX vs. cascade delete.
3. **Next feature to build.** Plan ordering suggests AI Document Analysis (with mock provider first) so Document Vault can store analysis results, then Policy Check. Confirm priority.

### Known follow-ups (non-blocking, from review)

- UI: type the case status with `CaseStatus` instead of a raw string union.
- UI: migrate `useEffect` fetching to TanStack Query (`queryClient` already wired).
- UI: centralize the Eden Treaty `as never` casts if the pattern repeats.

### Iteration 2 — done (PR #2)

**AI Document Analysis**

- Table `document_analyses` with `id`, `document_id` (FK cascade), `document_type`, `status`, `result` (JSON in TEXT), `error`, `prompt_name`, `prompt_version`, `schema_version`, `model_provider`, `model_name`, `created_at`.
- Analysis status state machine on `documents.analysis_status`: `pending --start--> processing --complete--> completed`, `processing --fail--> failed`, `failed --retry--> processing`.
- Zod schemas for 5 document types as discriminated union on `document_type`: `contract_requirements`, `current_policy`, `carrier_quote`, `loss_history`, `other`. Each has domain-specific fields (coverages, endorsements, evidence, etc.).
- Provider interface (`AnalysisProvider`) with two implementations:
  - `MockAnalysisProvider` — deterministic payloads using Northstar Logistics scenario data. Used in tests and when Modal is not configured.
  - `ModalAnalysisProvider` — calls Modal Web Function via HTTP `fetch()` with `Modal-Key`/`Modal-Secret` auth headers. Env vars: `MODAL_ENDPOINT`, `MODAL_KEY`, `MODAL_SECRET`.
- Service orchestration: validate document ownership, transition status, call provider, validate response with Zod (1 retry on validation failure), persist result, update document status.
- `AppError` instances are not retried — only unknown/network errors enter the retry path.
- Routes: `POST /cases/:case_id/documents/:document_id/analyze`, `GET .../analysis`, `GET .../analysis/history`.
- SDK exports: `@bind/api/analysis` (types: AnalysisResult, AnalysisResponse, EvidenceItem, CoverageItem, EndorsementItem, etc.).
- 10 e2e tests (all using mock provider).
- Simple throwaway UI: Analyze button per document, colored status badge, expandable JSON result view.

### Deviations from the plan (iteration 2)

- **No PDF upload/storage or page-image conversion.** The provider interface receives document metadata, not page images. PDF pipeline is out of scope.
- **No prompt files.** Prompts are not yet in dedicated `.md` files — the mock provider returns fixed data, and the Modal provider delegates prompting to the deployed web function.
- **No document type auto-classification.** `document_type` remains required at document creation.
- **Synchronous endpoint.** `POST /analyze` blocks until the provider returns. Acceptable for mock (instant) and dev Modal usage. Will need async conversion if production latency is a concern.
- **JSON in TEXT column.** Analysis results are stored as serialized JSON in a TEXT column. Sufficient for current needs.
- **Re-analysis of completed documents is blocked.** The state machine does not allow `start` from `completed`. A `reanalyze` event can be added later if needed.

### Open decisions for next iteration (from iteration 2)

1. **Re-analysis path.** Should completed documents support re-analysis via a `reanalyze` event? Currently blocked.
2. **Async analysis.** If Modal latency is too high for synchronous calls, should the endpoint become async (webhook/polling)?
3. Open decisions from iteration 1 still apply (PATCH on terminal cases, case delete behavior).

### Known follow-ups (non-blocking, from iteration 2 review)

- Unify `AnalysisStates` (state machine) with `AnalysisStatusValues` (documents schema) — two sources for the same enum.
- `SCHEMA_BY_DOCUMENT_TYPE` is exported but unused — either use it in validation or remove it.

### Iteration 3 — done (PR #3)

**Policy Check**

- Table `policy_check_results` with `id`, `case_id` (FK restrict), `requirements_document_id` (FK cascade), `target_document_id` (FK cascade), `target_document_type`, `results` (JSON array), `summary_counts` (JSON), `created_at`.
- 5 deterministic requirement check functions (pure business logic, no LLM):
  1. `cgl_limit` — Commercial General Liability limit comparison
  2. `auto_limit` — Commercial Auto Liability limit comparison
  3. `cyber_coverage` — Cyber Liability coverage/limit check
  4. `additional_insured` — Additional Insured endorsement presence
  5. `waiver_primary` — Waiver of Subrogation + Primary/Non-Contributory endorsement presence
- Verdict types: `ok`, `gap`, `missing`, `review`, `not_applicable`
- Severity levels: `blocking`, `material`, `minor`, `informational`
- Evidence trails: each result records what was required, what was found, and the source document
- One-shot computation — no state machine needed. POST runs the check synchronously, stores result, returns 201.
- Re-running checks is allowed (each POST creates a new row). GET returns latest, GET /history returns all.
- String matching: case-insensitive `includes()` for coverage_type / endorsement_type matching.
- Routes: `POST /cases/:case_id/policy-check`, `GET .../policy-check`, `GET .../policy-check/history`.
- SDK exports: `@bind/api/policy-check` (types: PolicyCheckResponse, CheckResultItem, SummaryCounts, CheckVerdict, CheckSeverity, CheckEvidence).
- 9 e2e tests covering: all-OK scenario (Carrier B), gaps/missing scenario (current policy), error cases, filtering, history.
- Simple throwaway UI: run policy check with document selection, view results with colored verdict badges.

### Deviations from the plan (iteration 3)

- **No `limit_basis` comparison.** The plan mentions checking per-occurrence vs aggregate, but for this iteration we only compare `limit_amount` values. Basis mismatch could be added as a `review` verdict later.
- **`page_numbers` always empty.** Evidence schema includes page references but check functions don't currently populate them from the analysis evidence. Available for future enrichment.
- **Elysia route schema uses `t.String()` for verdict/severity** instead of union literals. Zod schemas have proper enums but OpenAPI spec is loose. Acceptable for current stage.

### Open decisions for next iteration (from iteration 3)

1. **Next feature to build.** Plan ordering suggests Quote Comparison, then Proposal / Decision Memo.
2. **Limit basis comparison.** Should different `limit_basis` values (per occurrence vs aggregate) trigger a `review` verdict?
3. **Evidence enrichment.** Should check functions pull page numbers from the analysis evidence into the check evidence?
4. Previous open decisions still apply (re-analysis path, async analysis, PATCH on terminal cases).

### Known follow-ups (non-blocking, from iteration 3 review)

- Waiver/primary keyword matching is permissive (single-keyword substring match) — could produce false positives with complex endorsement names.
- Route response schemas should use `t.Union` with literals for proper OpenAPI enum documentation.

### Iteration 4 — done (PR #4)

**Quote Comparison**

- Table `quote_comparisons` with `id`, `case_id` (FK restrict), `requirements_document_id` (FK cascade), `target_document_ids` (JSON array in TEXT), `result` (JSON in TEXT), `created_at`.
- Deterministic comparison engine (pure functions, zero I/O):
  - `buildOptionSummary()` — builds per-option summary from analysis data + policy check results
  - `computeRecommendation()` — deterministic recommendation algorithm (4 tiers)
  - `runComparison()` — orchestrates options + recommendation
- Per-option summary includes: carrier_name, premium (nullable for current_policy), deductible_summary, meets_core_requirements, policy_check_summary counts, strengths, risks, missing_requirements, review_items.
- Recommendation algorithm: single qualifying option → `meets_all_requirements_only_option`; multiple → lowest cost → `meets_all_requirements_lowest_cost`; none → fewest gaps → `fewest_material_gaps`.
- Minimum 2 targets enforced (Elysia schema `minItems: 2` returns 422, service defense-in-depth returns 400).
- Policy check results required as prerequisite for each target document.
- Routes: `POST /cases/:case_id/quote-comparison`, `GET .../quote-comparison`, `GET .../quote-comparison/history`.
- SDK exports: `@bind/api/quote-comparison` (types: QuoteComparisonResponse, ComparisonResult, OptionSummary, RecommendationSignal, RecommendationReason).
- 10 e2e tests covering: full comparison, per-option correctness, recommendation correctness, error cases, GET/history.
- Simple throwaway UI: auto-select docs, run comparison, recommendation banner, side-by-side option cards.

### Deviations from the plan (iteration 4)

- **No Carrier A mock as separate quote.** The plan mentions Carrier A as a quote option, but the mock data only has one carrier_quote (Carrier B). The current policy is "Carrier A" by name but uses the `current_policy` document type which has no `premium` field. This is handled correctly — premium is null for current policies.
- **No multi-run diffing.** Each POST creates a new comparison; there's no diff between runs.

### Open decisions for next iteration (from iteration 4)

1. **Next feature to build.** Proposal / Decision Memo — the final LLM-driven feature that turns structured review data into stakeholder-facing prose.
2. Previous open decisions still apply (re-analysis path, async analysis, PATCH on terminal cases, limit_basis comparison).

## Demo Scenario

The working demo scenario is a fictitious client:

```txt
Client: Northstar Logistics
Situation: Northstar needs commercial insurance coverage to satisfy a new enterprise contract.
Input: The team received two carrier quotes and needs to check requirements, compare options, and prepare a recommendation.
```

Expected documents:

```txt
Client Contract Requirements.pdf
Current Policy.pdf
Carrier A Quote.pdf
Carrier B Quote.pdf
Loss History.pdf
```

## Review Case

### Purpose

A Review Case is the top-level object for the application flow.

It represents one commercial insurance review decision:

```txt
For this specific insurance need, do the available options satisfy the requirements, and which option should the team recommend?
```

For the current showcase, Bind does not need a broader client workspace model. Each review case can stand on its own.

### Scope

A Review Case owns:

```txt
Case metadata
Documents
Document analysis results
Policy Check results
Quote Comparison output
Proposal / Decision Memo output
```

The Northstar Logistics scenario is one Review Case.

### Case Metadata

Expected case-level fields:

```txt
case_id
case_name
client_name
status
created_at
updated_at
```

Example:

```txt
case_name: Northstar Contract Coverage Review
client_name: Northstar Logistics
status: in_review
```

### Validation Scope

For the current showcase, each Review Case can use the same predefined validation checklist used by Policy Check.

This keeps the product focused and avoids needing custom workspace-level configuration.

Later, Review Cases could support custom requirement sets, client-specific rules, or broker-specific templates, but that is not required for the current plan.

## Technical Direction

The application is not targeting production yet. Implementation decisions may choose practical local or sandbox-friendly approaches over production-grade optimization.

The project should still be planned with clean boundaries:

- Zod schemas define AI response payloads.
- TypeScript types are inferred/exported from those schemas.
- Prompts live in dedicated prompt files.
- LLM calls are made through adapters with strict contracts.
- Feature modules consume validated payloads, not raw model responses.
- Mock providers remain available so features can work even when real LLM analysis is unavailable or unreliable.

## AI Document Analysis Module

### Purpose

The AI document analysis module receives insurance documents and returns validated, feature-specific structured data.

The system should not be designed around traditional OCR-first extraction. Instead, the preferred workflow is multimodal document analysis:

```txt
Upload PDF
-> convert PDF pages to images
-> send page images + feature prompt to LLM
-> request a strict JSON payload
-> validate the response with Zod
-> store the normalized analysis result
-> let downstream features use the validated payload
```

### PDF Handling

The system does not need to extract text from PDFs before analysis.

PDFs should be converted into page images so a vision-capable model can read and analyze the pages directly. This fits local multimodal models such as Qwen through Ollama, where prompts can be sent with images.

The PDF-to-image layer is mechanical infrastructure, separate from insurance analysis. Possible implementation choices can be decided later, but the feature plan assumes this capability exists.

### LLM Adapter Pattern

LLM usage should be centralized behind an adapter-style abstraction.

Expected providers:

```txt
OllamaVisionProvider
MockProvider
OpenAICompatibleVisionProvider
```

The adapter should allow local development with Ollama, deterministic mocks for sandbox/demo usage, and another compatible hosted provider later if needed.

The rest of the application should call a stable contract rather than provider-specific APIs.

Example responsibilities:

```txt
Analyze uploaded document pages
Classify document type when missing
Extract feature-specific fields
Generate human-readable summaries
Validate structured model output
Return normalized payloads to feature modules
```

### Prompts

Prompts should live in a dedicated prompt folder.

Example prompt files:

```txt
packages/api/src/modules/ai/prompts/classify-document.md
packages/api/src/modules/ai/prompts/analyze-document.md
packages/api/src/modules/ai/prompts/extract-contract-requirements.md
packages/api/src/modules/ai/prompts/extract-policy-fields.md
packages/api/src/modules/ai/prompts/extract-carrier-quote.md
packages/api/src/modules/ai/prompts/analyze-loss-history.md
```

Each prompt should map to an explicit Zod schema. The prompt must ask the model to return data in the exact shape expected by the schema.

### Schemas And Types

Zod schemas are the source of truth for AI output.

Each feature may define the fields it needs. The model response can include both structured fields and human-readable generated text.

Examples:

```txt
document_type
document_type_confidence
summary
extracted_fields
coverage_limits
deductibles
endorsements
risk_notes
insurance_comparison
broker_recommendation
evidence
```

Human-readable fields are allowed when useful. For example, a comparison feature may ask for:

```txt
insurance_comparison: string
```

The important rule is that every field must be part of the schema for that feature and validated before use.

### Validation And Recovery

LLM output cannot be assumed valid.

The analysis flow should include:

```txt
Prompt request
-> model response
-> parse JSON
-> validate with Zod
-> if invalid, retry the same request
-> if still invalid, return an analysis error
```

Feature modules should not consume unvalidated model output.

Failure behavior:

```txt
Invalid JSON:
Retry the same request.

Missing required fields:
Retry the same request.

Low confidence:
If the payload is valid, keep the normal flow and preserve confidence values for downstream Review handling.

Unsupported document type:
Return an unsupported document type error to the client.

Timeout:
Return HTTP 500.
```

### Analysis Versioning

Analysis results should store enough version metadata to understand how they were produced.

Expected metadata:

```txt
prompt_name
prompt_version
schema_name
schema_version
model_provider
model_name
analysis_created_at
```

This prevents old analyses from silently becoming ambiguous when prompts, schemas, or model providers change.

### Evidence

When an answer depends on document content, the AI response should include evidence.

Evidence should be page-aware because documents are passed to the model as page images.

Expected evidence fields:

```txt
document_id
document_name
page_number
evidence_summary
confidence
```

Exact verbatim source text may not always be reliable from image-based model analysis, but page citation and a short evidence summary should be required.

## Document Vault

### Purpose

Document Vault is the source of documents and document analysis results for the rest of the product.

It stores or references the uploaded insurance documents, tracks their analysis status, and exposes validated analysis payloads for downstream features.

### Expected Documents

The Northstar Logistics scenario expects these document categories:

```txt
Client Contract Requirements
Current Policy
Carrier Quote
Loss History
Other
```

The sample Vault documents are:

```txt
Client Contract Requirements.pdf
Current Policy.pdf
Carrier A Quote.pdf
Carrier B Quote.pdf
Loss History.pdf
```

### Document Metadata

Each document should support metadata such as:

```txt
document_id
name
document_type
pages
uploaded_by
uploaded_at
analysis_status
last_analyzed_at
analysis_version
```

The document type is optional at upload/analysis time.

### Document Type Handling

If `document_type` is provided, the analysis module can use the matching document-specific prompt and schema directly.

If `document_type` is not provided, the LLM must first infer the document type before extracting fields.

The prompt should require:

```txt
If document_type is not provided, first identify the document type from the document pages.
Use the inferred document type to decide which fields are relevant.
Return the inferred document_type, confidence, reasoning, extracted data, summary, and evidence.
```

### Analysis Result

Document analysis should return structured fields plus a human-readable summary.

The exact fields depend on the document type and feature need.

Examples:

```txt
Client Contract Requirements:
- required coverage types
- required limits
- required endorsements
- required certificates or proof
- summary
- evidence

Current Policy:
- current coverage types
- limits
- deductibles
- endorsements
- exclusions or review notes
- summary
- evidence

Carrier Quote:
- carrier name
- premium
- coverage types
- limits
- deductibles
- included endorsements
- exclusions or conditions
- summary
- evidence

Loss History:
- claim count
- claim amounts
- notable loss patterns
- summary
- evidence
```

### Mocking Strategy

The Vault may support real PDF upload and page-image conversion, while still allowing analysis payloads to be mocked.

This keeps feature development possible even if LLM quality, model availability, or PDF conversion is not ready.

Mock analysis should use the same schemas as real analysis.

### Consumers

Document Vault analysis results are consumed by later features such as:

```txt
Policy Check
Quote Comparison
Proposal / Decision Memo
```

Those modules should consume validated document analysis payloads, not raw PDFs or raw LLM responses.

## Policy Check

### Purpose

Policy Check is the core compliance review feature.

It answers:

```txt
For each insurance requirement, does the current policy or carrier quote satisfy it?
If not, what is missing, insufficient, ambiguous, or needing review?
```

The feature should not rely on the LLM to make every compliance decision. Instead, the LLM is used upstream to extract normalized values from documents. Policy Check then compares those values against a defined checklist of requirements.

### Requirement Checklist

To keep the feature understandable, testable, and less dependent on model reasoning, Policy Check should use a predefined list of requirement checks.

Initial checklist:

```txt
Commercial General Liability minimum limits
Commercial Auto Liability minimum limit
Cyber Liability required coverage and minimum limit
Additional Insured endorsement
Waiver of Subrogation / Primary and Non-Contributory wording
```

These checks represent the business rules Bind knows how to evaluate.

The first catalog intentionally focuses on five strong contract-driven requirements common in commercial insurance reviews:

```txt
1. Commercial General Liability
   Check per-occurrence and aggregate limits.

2. Commercial Auto Liability
   Check combined single limit for owned, hired, or non-owned autos when applicable.

3. Cyber Liability
   Check whether cyber/network privacy coverage is required and whether the quoted limit satisfies the requirement.

4. Additional Insured Endorsement
   Check whether the required party is included as additional insured on applicable liability policies.

5. Waiver of Subrogation / Primary and Non-Contributory
   Check whether required risk-transfer wording or endorsements are present.
```

Workers' Compensation / Employer's Liability is also common in vendor contracts, but it is not part of the first five-item catalog because the current scenario is focused on quote comparison and contract compliance gaps that are more visible in commercial policy/quote review.

### Deterministic Comparison

Policy Check should compare normalized values from document analysis payloads.

Example:

```txt
Requirement:
General Liability aggregate must be at least $2,000,000.

Carrier A Quote:
General Liability aggregate is $1,000,000.

Result:
Gap.
Carrier A is $1,000,000 below the required aggregate limit.
```

This should be implemented as deterministic business logic, not as a free-form LLM answer.

### Result Types

Policy Check should use fixed result types:

```txt
OK
Gap
Missing
Review
Not Applicable
```

Definitions:

```txt
OK:
The requirement is satisfied.

Gap:
The requirement exists, but the provided value is below the required threshold.

Missing:
The required coverage, endorsement, or condition was not found.

Review:
The result is ambiguous, evidence is weak, language is unclear, or a human should verify it.

Not Applicable:
The requirement does not apply to the selected document, policy, or quote.
```

### Result Severity

Policy Check should also support severity so downstream features can distinguish blocking issues from informational review notes.

Expected severity values:

```txt
blocking
material
minor
informational
```

Severity should be deterministic where possible.

Example:

```txt
A missing mandatory Cyber Liability requirement can be blocking.
A lower-than-required General Liability aggregate can be material or blocking depending on the checklist configuration.
A low-confidence extracted value can be informational or Review, but should not stop the normal flow if the payload is valid.
```

### Evidence

Each Policy Check result should preserve source evidence from the underlying document analysis payload.

A result should be able to explain:

```txt
What was required
What was found
Which document/page supports the requirement
Which document/page supports the found value
Why the result was classified as OK, Gap, Missing, Review, or Not Applicable
```

Example evidence:

```txt
Requirement source:
Client Contract Requirements.pdf — page 4

Found value source:
Carrier A Quote.pdf — page 2
```

### LLM Usage

Policy Check should not use the LLM for normal deterministic comparisons.

The LLM may still be useful for:

```txt
Extracting normalized values before Policy Check runs
Identifying document type in the Vault
Flagging ambiguous language for Review
Generating human-readable explanations after deterministic results exist
```

The rule is:

```txt
If the requirement can be checked with known structured values and a known business rule, use code.
If the language is ambiguous or not represented by a deterministic rule, mark it as Review rather than pretending the system knows.
```

### Business Rule Documentation

Policy Check business rules should be documented directly in code with JSDoc where the rule may not be obvious.

This applies to:

```txt
Requirement check functions
Result classification helpers
State machines
Normalization functions
Coverage comparison utilities
Evidence mapping helpers
```

The goal is for future readers to understand the insurance meaning of a rule without reverse-engineering it from code.

Example of the expected documentation style:

```ts
/**
 * Evaluates whether the quoted General Liability aggregate limit satisfies
 * the contract requirement.
 *
 * Business rule:
 * - OK when the quoted aggregate limit is greater than or equal to the required aggregate.
 * - Gap when both values are known but the quoted limit is lower.
 * - Missing when no General Liability aggregate limit was extracted from the quote.
 * - Review when either value is ambiguous or low-confidence.
 */
```

### Normalized Insurance Data Model

Policy Check and Quote Comparison should operate on normalized insurance data, not raw model text.

Expected normalized fields include:

```txt
coverage_type
limit_amount
limit_basis
deductible
included
endorsement_type
evidence
confidence
```

The exact schema can vary by document type, but downstream modules should receive predictable typed values.

### Recommendation Rule

The recommendation rule should be deterministic and based on Policy Check plus Quote Comparison output.

Initial rule:

```txt
Prefer quotes that satisfy all mandatory requirements.
If multiple quotes satisfy mandatory requirements, compare premium, deductible, and risk notes.
If no quote satisfies mandatory requirements, recommend the option with the fewest material gaps and flag revisions needed before binding.
```

The LLM can later explain this recommendation in the Proposal / Decision Memo, but should not independently override it.

## Quote Comparison

### Purpose

Quote Comparison evaluates the current policy and received carrier quotes side by side.

It answers:

```txt
What are the material differences between the options?
Which options are cheaper, more complete, riskier, or non-compliant?
Which structured facts should be passed into the Proposal / Decision Memo?
```

Quote Comparison should produce a structured comparison result that can be stored and reused.

### Inputs

Quote Comparison consumes validated payloads from:

```txt
Document Vault analysis
Policy Check results
```

Expected inputs include:

```txt
Current Policy analysis
Carrier A Quote analysis
Carrier B Quote analysis
Policy Check result rows for each option
```

### Deterministic Comparison

Quote Comparison should be mostly deterministic.

It should compare known structured fields such as:

```txt
carrier_name
premium
deductible
coverage_limits
included_coverages
missing_requirements
policy_check_statuses
```

The feature should not depend on the LLM to decide basic comparisons like:

```txt
Which quote is cheaper?
Which quote has a higher deductible?
Which quote has more missing requirements?
Which quote satisfies all mandatory requirements?
```

Those decisions should be made in code using normalized data.

### Stored Comparison Output

The comparison result should be stored as structured data so it can be used by later features.

Example output fields:

```txt
option_id
option_name
carrier_name
premium
deductible
meets_core_requirements
policy_check_summary
strengths
risks
missing_requirements
review_items
```

Example option summaries:

```txt
Carrier A:
- Premium: $42,000
- Strength: lowest price
- Risk: misses Cyber Liability and General Liability aggregate requirement

Carrier B:
- Premium: $45,800
- Strength: meets all core requirements
- Risk: higher deductible

Current Policy:
- Premium: $39,200
- Risk: not compliant with new contract
```

### Recommendation Signal

Quote Comparison may produce a structured recommendation signal, but it should not be responsible for writing the final recommendation memo.

The deterministic recommendation rule can start as:

```txt
Recommend the lowest-cost quote that satisfies all mandatory requirements.
If no quote satisfies all mandatory requirements, identify the option with the fewest material gaps and flag required revisions.
```

For the Northstar Logistics scenario, the structured recommendation signal is:

```txt
Recommended option: Carrier B
Reason: Carrier B is more expensive than Carrier A, but satisfies the core contract requirements.
Carrier A is cheaper, but leaves material gaps.
```

### LLM Usage

Quote Comparison itself should not rely on the LLM for normal comparison logic.

The LLM may be used later by Proposal / Decision Memo to turn the stored comparison output into polished human-readable recommendation text.

The rule is:

```txt
Quote Comparison creates structured facts and recommendation signals.
Proposal / Decision Memo turns those facts into final prose.
```

## Proposal / Decision Memo

### Purpose

Proposal / Decision Memo creates the final stakeholder-facing recommendation.

It answers:

```txt
What should the commercial insurance team recommend, and how should that recommendation be explained to a client or internal stakeholder?
```

This is intentionally the most LLM-driven feature. Earlier modules produce structured facts and deterministic decisions. The memo feature turns those facts into clear business language.

### Inputs

The memo should be generated from validated and stored outputs from previous modules:

```txt
Client context
Document Vault summaries
Policy Check results
Quote Comparison output
Structured recommendation signal
```

The LLM should not independently re-decide the insurance recommendation from raw documents. It should write from the already-computed review data.

### Generation Model

The memo should be generated in one LLM call.

The prompt should ask for a full memo, but the response must be returned as a structured payload with separate fields.

Expected response shape:

```txt
executive_summary
coverage_gaps
quote_comparison
recommendation
next_steps
```

Example schema shape:

```ts
{
  executive_summary: string;
  coverage_gaps: string;
  quote_comparison: string;
  recommendation: string;
  next_steps: string[];
}
```

This gives the product a complete document-like output while still allowing the UI and API to render each section independently.

### Prompt Rules

The memo prompt should instruct the LLM to:

```txt
Use only the provided structured review data.
Do not invent coverages, limits, premiums, carriers, or requirements.
Explain the recommendation in business-friendly language.
Mention material gaps and tradeoffs.
Keep the tone appropriate for a B2B insurance/procurement workflow.
Return only the structured JSON payload matching the schema.
```

For the Northstar Logistics scenario, the recommendation should say that Carrier B is recommended because it satisfies the required General Liability, Cyber Liability, Additional Insured, and Waiver of Subrogation requirements. Carrier A may be cheaper, but it does not meet the contract requirements without revisions.

### Server-Sent Events Delivery

The API may expose the memo generation through a Server-Sent Events endpoint.

The underlying LLM generation can still happen as one complete call. After the full structured memo payload is available and validated, the API can emit each memo section one at a time.

For demo purposes, the SSE endpoint may intentionally delay approximately 3 seconds between emitted sections.

Example event order:

```txt
executive_summary
coverage_gaps
quote_comparison
recommendation
next_steps
complete
```

This allows the UI to show the memo being built section by section while keeping the implementation simple and schema-safe.

The SSE behavior is a delivery/presentation mechanism, not a requirement that each section be generated by a separate LLM call.

### Output Usage

The generated memo can be rendered as:

```txt
A final card in the review flow
A document-style preview
Copyable recommendation content
JSON API response content
```

The document-style output is preferred for B2B credibility, even if the UI initially displays it as a final card.

### Actions

The memo output should be available as JSON from the API.

Supported action:

```txt
Copy summary
```

Copy summary means the client can copy the generated recommendation text or selected memo sections from the JSON payload.

Not supported in the current plan:

```txt
Export PDF
Send for approval
```

Export PDF is not needed because results will be returned as JSON responses.

Send for approval would mean a separate approval workflow, such as routing the memo to a manager, stakeholder, or broker for review before final use. That workflow is not part of the current plan.
