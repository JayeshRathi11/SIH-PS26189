# Live phased-ingestion demo script

Three brand-new cases, each split into numbered phases (`1_...`, `2_...`).
Upload phase 1 first via **+ Add New Case**, let extraction finish, then
upload phase 2 via **Add evidence** on that same case (not a new case) --
that's what makes the resolver merge the new documents into what's already
there instead of starting over, and is what makes new entities/links
visibly appear on the board as each phase lands.

None of this touches the original 10 pre-built domains -- it's designed to
replace reliance on them for the live part of the demo. Back up + clear the
DB first with `python scripts/backup_and_reset_db.py --reset` (run on your
own machine, not through the sandboxed shell) so the board starts empty.

## Case 1: "Amber Route" (narcotics + arms smuggling)

1. **+ Add New Case** -- ID e.g. `case-amber`, title "Amber Route Seizure",
   upload `case_amber_route/1_fir_ajnala_border_seizure.txt`.
   Entities that appear: Ranjit Bhullar, Sukhwinder Mann (couriers, arrested),
   "Billa" -> **Iqbal Deol** (local coordinator), a Maruti Ertiga, the heroin/
   arms seizure. "N.E.C." is mentioned but not yet identified -- a loose
   thread on purpose.
2. Open the case -> **Add evidence** -> upload
   `case_amber_route/2_surveillance_hawala_trace.txt`.
   New entities/links appear: **Naseem Contractor** is identified as N.E.C.,
   his currency exchange front, the call intercept linking him to Deol, and
   a reference to an unconnected "Delhi account" (a deliberate dangling
   thread -- real investigations don't close every loop immediately).

## Case 2: "Loan Trap" (cyber fraud + sextortion + hawala)

1. **+ Add New Case** -- ID e.g. `case-loantrap`, title "Loan Trap Fraud
   Ring", upload `case_loan_trap/1_fir_mundka_loan_fraud.txt`.
   Entities: the call-center raid, **Devraj Oberoi** ("DJ", supervisor),
   **Priyanka Solanki** (procures mule-account "kits"), the linked
   sextortion module.
2. **Add evidence** -> upload `case_loan_trap/2_financial_intel_trace.txt`.
   This is the payoff: the financial trace identifies the cash-out handler
   as **Naseem Contractor** -- the *same* hawala operator from Amber Route.

## The reveal

Switch to **All Domains (Master View)**, open **Pathfinder**, and trace a
path from **Iqbal Deol** to **Devraj Oberoi**. Entity resolution is global
(pipeline/resolution/entity_resolver.py matches names across every case,
not per-domain), so "Naseem Contractor" merged into one canonical entity
the moment his name reappeared in Case 2 -- the path resolves through him,
live, connecting two cases you uploaded minutes apart with no manual
linking. This is the concrete answer to "why does the current dataset feel
fake": here the connection is discovered by evidence (a financial trace),
not pre-baked into the source files.

## Case 3: "Junction Structuring" (money laundering, deliberately standalone)

1. **+ Add New Case** -- upload
   `case_junction_structuring/1_fir_konkan_bank_structuring.txt`.
   Entities: **Vikram Salvi** (account holder), **Sandeep Kale**
   (coordinator), "Bhau" (financier, unidentified).
2. **Add evidence** -> upload
   `case_junction_structuring/2_surveillance_bhau_identified.txt`.
   Reveals Bhau = **Ramesh Bhosale** (Bhosale Agro Traders), plus a vehicle
   (MH04CD1234) and call intercepts.

This case does **not** connect to the other two -- on purpose. It's the
proof that the new dataset isn't just a different-looking version of the
same "everything eventually touches one hub" problem: some cases are
genuinely separate, exactly like real casework.

## Notes

- Every document here is fictional -- names, addresses, vehicle plate, and
  amounts are all invented for this demo.
- If you want to also show the PII-redaction pipeline step live, mention
  that `pipeline/ingestion/sanitizer.py` redacts Aadhaar/PAN/passport-style
  numbers before any text reaches the LLM -- none of these three cases
  currently embed one, so add a line like `Aadhaar: 5327 8814 2290` to any
  phase-1 file first if you want that beat in the walkthrough.
