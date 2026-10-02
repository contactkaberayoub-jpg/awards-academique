-- Instructor earnings are DERIVED server-side from PAID orders (2% of the order
-- amount, see backend app.earnings.instructor-rate-percent). No earnings ledger
-- table is needed: the balance is recomputed from orders + payout_requests.
--
-- only the payout side of the money flow is persisted here:
--   * instructor_payout_accounts  - where the instructor wants to be paid
--   * payout_requests             - the PENDING/PAID/REJECTED request ledger

CREATE TYPE payout_request_status_enum AS ENUM ('PENDING', 'PAID', 'REJECTED');
CREATE TYPE payout_method_enum AS ENUM ('PAYPAL', 'BANK');

CREATE TABLE IF NOT EXISTS instructor_payout_accounts (
    id              UUID PRIMARY KEY,
    instructor_id   UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name       VARCHAR(255) NOT NULL,
    country         VARCHAR(100) NOT NULL,
    method          payout_method_enum NOT NULL DEFAULT 'PAYPAL',
    paypal_email    VARCHAR(255),
    bank_name       VARCHAR(255),
    bank_account_name VARCHAR(255),
    iban            VARCHAR(64),
    swift           VARCHAR(32),
    currency        VARCHAR(3) NOT NULL DEFAULT 'MAD',
    created_at      TIMESTAMP NOT NULL,
    updated_at      TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS payout_requests (
    id                   UUID PRIMARY KEY,
    instructor_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_amount     NUMERIC(12, 2) NOT NULL CHECK (requested_amount > 0),
    currency             VARCHAR(3) NOT NULL,
    method               payout_method_enum NOT NULL DEFAULT 'PAYPAL',
    destination_ref      VARCHAR(500),
    status               payout_request_status_enum NOT NULL DEFAULT 'PENDING',
    rejection_reason     TEXT,
    provider_ref         VARCHAR(100),
    notes                TEXT,
    requested_at         TIMESTAMP NOT NULL,
    reviewed_at          TIMESTAMP,
    reviewed_by          UUID REFERENCES users(id),
    created_at           TIMESTAMP NOT NULL,
    updated_at           TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_instructor ON payout_requests (instructor_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests (status);
CREATE INDEX IF NOT EXISTS idx_payout_accounts_instructor ON instructor_payout_accounts (instructor_id);