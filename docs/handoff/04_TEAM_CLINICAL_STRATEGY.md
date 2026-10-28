# Clinical adoption / Research notes from teammate (supplied 2026-10-28)
**Source of this file:** `friend_summary_original.txt` (original user-uploaded text). This is a faithful product interpretation, NOT an independent systematic review. The teammate's text names PubMed, ScienceDirect, NHC and Thai journals but mostly provides **no primary URLs/DOIs or detailed bibliographic entries**. All figures or clinical comparisons must be source-checked before being described as verified research or used as treatment guidance.

## The teammate's central proposal
Adopt a **targeted evidence-based Hybrid Medicine / Integrative Care** strategy rather than trying to convince every conventional physician that Thai Traditional Medicine is universally better. Claim only: 'The right Thai traditional medicine, for the right patient, at the right time, supported by evidence.' Align with routine physician workflow and patient safety.

## Suggested initial beachhead and why
**Knee Osteoarthritis (Knee OA)** in Orthopedics and Rehabilitation Medicine as the initial target. Source reasons: measurable pain/function, existing Thai studies for topical herbal formulations, a potentially simpler risk profile than polyherbal oral regimens, suitable for multidisciplinary follow-up. Other niches cited: selected functional dyspepsia without alarm features, primary care chronic symptoms, nonspecific chronic back pain. Do not broaden indication in product without clinician protocol.

## Translation of 5C Adoption Strategy into CareBridge features
| Teammate's 5C | Product implementation |
|---|---|
| Clinical Relevance | Disease-specific Knee OA patient review card; reason for consult and inclusion/exclusion status |
| Credible Evidence | Verified RCT/systematic-review/guideline references with sample size, comparator, outcomes, limitations and source links; do not hide uncertainty |
| Clinical Champion | Clinician reviewer / pharmacist / Thai traditional medicine professional roles and audit; human-in-loop approval |
| Convenient Workflow | Existing prescribing screen integration, minimal clicks, formulary order-set with official current references, interaction/contraindication review and prescription sync to YaiPrompt |
| Continuous Feedback | Longitudinal patient-reported pain, function, adverse effects, clinician decision, audit and feedback summary |

## Clinical claim examples in the supplied summary — **verification queue**
The following numbers are stated by the teammate and have **NOT been independently checked here**:
1. Knee OA: Thai Medicinal Plant-4 topical cream trial, reportedly **199 participants**, 4 weeks, within-study noninferiority to topical diclofenac (must verify margin, endpoints and adverse events).
2. Functional dyspepsia: 2023 BMJ Evidence-Based Medicine trial reportedly **206 participants**; curcumin vs omeprazole vs combination (the teammate explicitly warns not to call it a formal noninferiority trial or broadly substitute PPI).
3. Knee OA: 2026 Sahatsatara microemulsion study reportedly **84 participants**, 28 days (must verify formulation, study design, comparators, confidence intervals and product registration).
4. Thai hospital implementation: 2026 report of Huai Yot Hospital herbal prescriptions reportedly showed **+74.64%** Andrographis and **+104.39%** Sahatsatara in different comparison periods. The source itself warns these are prescription-volume changes, NOT clinical outcomes or causal evidence.
5. 2026 Thai 6-hospital qualitative research reportedly identifies evidence, safety, guidelines and workflow as barriers; verify methods and source.
6. Chinese integrated-care policy examples (2021, 2024, 2025): organizational integration and MDT are useful **implementation concepts**, NOT proof that every TCM therapy is efficacious.

**Developer instruction:** create a source verification table `reference_id, original_claim, bibliographic_details, DOI_or_PMID, full_text_checked, citation_verified, reviewer, clinical_limitations, date, display_state`. Unless validated, `display_state=RESEARCH_REVIEW_PENDING`; don't render fabricated PubMed IDs, DOI, claims of NLEM eligibility, safety, effectiveness or official approval.

## Suggested patient/clinician pilot (90 days, from teammate)
- **Days 1–30 design:** 5–10 volunteer physicians, pharmacist/TTM co-design, formulary/P&T evaluation, clinically governed protocol and evidence cards.
- **Days 31–60 controlled implementation:** selected consenting Knee OA patients; documented standard-care continuation; clinicians consider an appropriate complementary topical strategy only if permitted and reviewed; collect patient-reported VAS and function, use WOMAC only if instrument/protocol available, log adverse events and clinician reasons.
- **Days 61–90 evaluation:** appropriate adoption, clinical outcomes, adverse events, prescription error rates, workload and cost; decide to continue, revise or stop.
- **No success metric based only on increasing number of herbal prescriptions.** Appropriate safe use and genuine patient outcomes matter.

## What teammate's document does NOT provide
- It does NOT specify YaiPrompt's 4-screen UX, a doctor-to-home prescription data contract, event states, a deployable FHIR endpoint, OCR accuracy in current repository, authenticated hospital integration, validated dosing algorithms, or food recommendation data.
- Those technical pieces in this handoff are **product/engineering proposals built from the project owner's discussion and verified repository structure**, not claims from teammate's research.

## CareBridge feature brief for Claude
Create a *non-blocking, optional* `EvidenceReviewPanel` / `KneeOAFollowupCard` for a synthetic selected patient. Show (1) clinical problem, (2) evidence review status and verifiable citations when available, (3) contraindications and incomplete medication history, (4) clinician/pharmacist sign-off requirement, (5) follow-up goals and observed patient-reported outcomes. It should integrate with the EXISTING workflow, not force an extra duplicate intake form. Do not auto-select herb, dosing, or an interaction verdict.

## Safety language
- 'การแพทย์แผนไทยอาจเป็นทางเลือกเสริมในข้อบ่งใช้ที่คัดเลือกและมีหลักฐานรองรับ' — acceptable as strategic framing.
- 'ยาสมุนไพรปลอดภัยกว่ายาแผนปัจจุบัน' — **not** acceptable as a general assertion.
- 'ไม่มีการเตือนจากฐานตัวอย่าง' — not synonymous with 'ไม่มีอันตรกิริยา'.
- 'ข้อมูลติดตามจากผู้ป่วย' — not an objectively confirmed treatment outcome.
