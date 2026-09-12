-- Leasing & Tenant Screening demo schema
--
-- Postgres is the system of record. Airtable mirrors `leads` for the demo board
-- only and is never read back.
--
-- No real PII lives here. SSN is stored as last-4 only; the raw value is
-- discarded on arrival and never written.

BEGIN;

DROP TABLE IF EXISTS message_log CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS criteria_config CASCADE;

-- ---------------------------------------------------------------------------
-- criteria_config
--
-- The manager's published screening criteria. HUD's May 2024 guidance says a
-- screening tool should "implement, rather than set" the housing provider's
-- policies, so every threshold lives here as data - never in code, never in a
-- prompt. The criteria engine reads this table and nothing else.
-- ---------------------------------------------------------------------------
CREATE TABLE criteria_config (
    id                      SERIAL PRIMARY KEY,
    name                    TEXT        NOT NULL,
    -- Income multiple is applied to TENANT-RESPONSIBLE rent, not gross rent.
    -- Applying it to gross rent is treated as source-of-income discrimination
    -- in the 19 states + DC + 100+ localities that protect it.
    income_multiple         NUMERIC(4,2) NOT NULL DEFAULT 3.00,
    min_credit_score        INTEGER     NOT NULL DEFAULT 650,
    conditional_credit_min  INTEGER     NOT NULL DEFAULT 600,
    max_eviction_filings    INTEGER     NOT NULL DEFAULT 0,
    eviction_lookback_years INTEGER     NOT NULL DEFAULT 5,
    -- How far the documented and verified income may diverge before the file is
    -- flagged for a human.
    income_mismatch_tolerance_pct NUMERIC(5,2) NOT NULL DEFAULT 10.00,
    is_active               BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- units
--
-- Property facts. Doubles as the grounded knowledge base for the FAQ bot: the
-- model may answer only from these columns and `faq_facts`.
-- ---------------------------------------------------------------------------
CREATE TABLE units (
    id                  SERIAL PRIMARY KEY,
    unit_code           TEXT        NOT NULL UNIQUE,
    address             TEXT        NOT NULL,
    beds                INTEGER     NOT NULL,
    baths               NUMERIC(3,1) NOT NULL,
    sqft                INTEGER,
    rent_amount         NUMERIC(10,2) NOT NULL,
    deposit_amount      NUMERIC(10,2) NOT NULL,
    available_from      DATE        NOT NULL,
    pet_policy          TEXT,
    pet_fee_monthly     NUMERIC(10,2),
    parking             TEXT,
    utilities_included  TEXT,
    laundry             TEXT,
    lease_term_months   INTEGER     NOT NULL DEFAULT 12,
    -- Free-form additional facts the FAQ bot may quote. Anything not here is
    -- "I don't have that - let me get someone to confirm."
    faq_facts           JSONB       NOT NULL DEFAULT '{}'::jsonb,
    status              TEXT        NOT NULL DEFAULT 'available'
                        CHECK (status IN ('available', 'application_pending', 'leased')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- leads
--
-- Front of funnel: inquiry, conversation, pre-qualification, tour.
-- Pre-qualification answers here are SELF-REPORTED and UNVERIFIED. They exist
-- to triage tour scheduling and are never a rental decision.
-- ---------------------------------------------------------------------------
CREATE TABLE leads (
    id                  SERIAL PRIMARY KEY,
    ref_token           TEXT        NOT NULL UNIQUE,   -- R-xxxx, used to match replies
    unit_id             INTEGER     REFERENCES units(id),
    source              TEXT        NOT NULL CHECK (source IN ('zillow_email', 'web_chat', 'manual')),
    prospect_name       TEXT,
    prospect_email      TEXT,
    -- Zillow relays leads through an anonymised address and does not include a
    -- phone number, so this is usually null. That is real behaviour, not a gap.
    prospect_phone      TEXT,

    status              TEXT        NOT NULL DEFAULT 'new'
                        CHECK (status IN ('new','engaged','prequalified','prequal_not_met',
                                          'tour_booked','toured','applied','closed')),

    -- Self-reported pre-qualification answers
    move_in_date            DATE,
    stated_monthly_income   NUMERIC(10,2),
    pets                    TEXT,
    vehicles                INTEGER,
    occupants               INTEGER,
    prequal_result          TEXT CHECK (prequal_result IN ('clear','not_clear','incomplete')),
    prequal_reasons         JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Tour
    calcom_booking_uid  TEXT,
    tour_starts_at      TIMESTAMPTZ,
    lock_code           TEXT,
    lock_code_source    TEXT,       -- always 'mock' in this build

    -- Chat memory for the web widget, keyed by session
    conversation_state  JSONB       NOT NULL DEFAULT '{}'::jsonb,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX leads_ref_token_idx ON leads (ref_token);
CREATE INDEX leads_prospect_email_idx ON leads (prospect_email);

-- ---------------------------------------------------------------------------
-- applications
--
-- Back of funnel. Holds the applicant file, every verification result, the
-- criteria outcome with its evidence trail, and the human decision.
-- ---------------------------------------------------------------------------
CREATE TABLE applications (
    id                  SERIAL PRIMARY KEY,
    ref_token           TEXT        NOT NULL UNIQUE,   -- A-xxxx
    lead_id             INTEGER     REFERENCES leads(id),
    unit_id             INTEGER     NOT NULL REFERENCES units(id),

    -- Applicant. No DOB and no full SSN is ever stored.
    full_name           TEXT        NOT NULL,
    email               TEXT        NOT NULL,
    phone               TEXT,
    ssn_last4           CHAR(4),
    current_address     TEXT,
    prior_address       TEXT,
    desired_move_in     DATE,

    -- Employment, as claimed on the form
    employer_name           TEXT,
    job_title               TEXT,
    employment_start_date   DATE,
    claimed_monthly_income  NUMERIC(10,2),

    occupants           JSONB       NOT NULL DEFAULT '[]'::jsonb,
    pets                JSONB       NOT NULL DEFAULT '[]'::jsonb,
    vehicles            JSONB       NOT NULL DEFAULT '[]'::jsonb,
    disclosures         JSONB       NOT NULL DEFAULT '{}'::jsonb,

    -- Rental assistance / housing voucher. The income multiple is applied to
    -- rent MINUS this amount. Required for source-of-income compliance.
    rental_assistance_amount NUMERIC(10,2) NOT NULL DEFAULT 0,

    -- FCRA written consent. Without this, no verification step may run.
    fcra_consent_at     TIMESTAMPTZ,

    -- Documents + what the model extracted, with a citation per value
    documents               JSONB   NOT NULL DEFAULT '[]'::jsonb,
    extracted_monthly_income NUMERIC(10,2),
    extraction_evidence     JSONB   NOT NULL DEFAULT '{}'::jsonb,

    -- Plaid Sandbox - REAL API call against test data
    plaid_user_id           TEXT,
    verified_monthly_income NUMERIC(10,2),
    plaid_raw               JSONB,
    plaid_verified_at       TIMESTAMPTZ,

    -- The three numbers the demo puts side by side
    income_comparison       JSONB   NOT NULL DEFAULT '{}'::jsonb,

    -- Consumer report - MOCK. Real data needs FCRA permissible-purpose
    -- credentialing this project does not have. Shaped like TransUnion
    -- ShareAble v3 so the swap is one node.
    bureau_source       TEXT,       -- always 'mock'
    credit_score        INTEGER,
    eviction_filings    INTEGER,
    bureau_raw          JSONB,

    -- Identity document check - MOCK. Plaid Sandbox does no OCR.
    identity_source     TEXT,       -- always 'mock'
    identity_match      BOOLEAN,
    identity_confidence NUMERIC(4,3),

    -- Deterministic criteria engine output. Never model-generated.
    criteria_result     TEXT CHECK (criteria_result IN ('meets_criteria','conditional','does_not_meet')),
    criteria_evidence   JSONB       NOT NULL DEFAULT '[]'::jsonb,
    criteria_evaluated_at TIMESTAMPTZ,

    -- Human decision. Nothing reaches a lease without a row here.
    decision            TEXT CHECK (decision IN ('approved','conditional','sent_to_review','withdrawn')),
    decided_by          TEXT,
    decided_at          TIMESTAMPTZ,
    decision_note       TEXT,

    -- Lease / DocuSign
    envelope_id         TEXT,
    lease_status        TEXT CHECK (lease_status IN ('not_sent','sent','signed','declined')),
    lease_sent_at       TIMESTAMPTZ,
    lease_signed_at     TIMESTAMPTZ,

    status              TEXT        NOT NULL DEFAULT 'received'
                        CHECK (status IN ('received','extracting','verifying','awaiting_decision',
                                          'decided','lease_sent','lease_signed','stopped_for_human')),

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX applications_ref_token_idx ON applications (ref_token);
CREATE INDEX applications_status_idx ON applications (status);

-- ---------------------------------------------------------------------------
-- message_log
--
-- Every message in or out, with its tier and guardrail result. Tier A may
-- auto-send; Tier B requires a recorded human approval before it leaves.
-- Also the dedupe surface: message_id must be unique.
-- ---------------------------------------------------------------------------
CREATE TABLE message_log (
    id                  SERIAL PRIMARY KEY,
    ref_token           TEXT,
    direction           TEXT        NOT NULL CHECK (direction IN ('inbound','outbound')),
    channel             TEXT        NOT NULL CHECK (channel IN ('email','web_chat','telegram','docusign')),
    tier                CHAR(1)     CHECK (tier IN ('A','B')),

    from_addr           TEXT,
    to_addr             TEXT,
    subject             TEXT,
    body                TEXT,
    -- RFC message id for inbound dedupe; unique so a replayed message cannot be
    -- processed twice.
    message_id          TEXT UNIQUE,

    guardrail_passed    BOOLEAN,
    guardrail_result    JSONB       NOT NULL DEFAULT '{}'::jsonb,

    approved_by         TEXT,
    approved_at         TIMESTAMPTZ,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX message_log_ref_token_idx ON message_log (ref_token);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER units_touch        BEFORE UPDATE ON units        FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER leads_touch        BEFORE UPDATE ON leads        FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER applications_touch BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

COMMIT;
