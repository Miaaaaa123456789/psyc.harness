-- PostgreSQL 17 structural draft. No production rows or credentials.
-- Apply only to the designated operations database; service implementation is pending.
BEGIN;
CREATE SCHEMA IF NOT EXISTS operations;
CREATE TABLE operations.source (
  id text PRIMARY KEY, kind text NOT NULL, config jsonb NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT false, mapping_version text,
  last_attempt_at timestamptz, last_success_at timestamptz,
  data_through date, status text NOT NULL DEFAULT 'unconfigured', last_error text
);
CREATE TABLE operations.ingest_run (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_id text NOT NULL REFERENCES operations.source(id),
  started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
  status text NOT NULL CHECK(status IN ('running','succeeded','failed','quarantined')),
  content_hash text, complete_scope boolean NOT NULL DEFAULT false,
  row_count integer CHECK(row_count >= 0), mapping_version text NOT NULL,
  error_code text
);
CREATE TABLE operations.raw_record (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id bigint NOT NULL REFERENCES operations.ingest_run(id),
  sheet_key text NOT NULL, row_key text NOT NULL, content_hash text NOT NULL,
  payload jsonb NOT NULL, fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(run_id,sheet_key,row_key)
);
CREATE TABLE operations.fact_revision (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_key text NOT NULL, source_id text NOT NULL REFERENCES operations.source(id),
  raw_id bigint REFERENCES operations.raw_record(id), business_date date NOT NULL,
  event_at timestamptz, source_submitted_at timestamptz, source_modified_at timestamptz,
  recorded_at timestamptz NOT NULL DEFAULT now(), verified_at timestamptz,
  previous_id bigint UNIQUE REFERENCES operations.fact_revision(id),
  definition_version text NOT NULL, payload jsonb NOT NULL,
  status text NOT NULL CHECK(status IN ('candidate','accepted','conflict','rejected')),
  tombstone boolean NOT NULL DEFAULT false, reason text
);
-- Authoritative event pointer: update under row lock + expected revision check.
-- Prior accepted versions remain immutable evidence; service must not UPDATE their payload.
CREATE TABLE operations.fact_head (
  event_key text PRIMARY KEY,
  fact_revision_id bigint NOT NULL UNIQUE REFERENCES operations.fact_revision(id)
);
CREATE INDEX fact_business_date_idx ON operations.fact_revision(business_date,source_id);
CREATE TABLE operations.metric_definition (
  id text NOT NULL, version text NOT NULL, unit text NOT NULL,
  grain text NOT NULL, source_ids text[] NOT NULL, formula text NOT NULL,
  null_policy text NOT NULL, dependencies text[] NOT NULL DEFAULT '{}',
  PRIMARY KEY(id,version)
);
CREATE TABLE operations.setting_revision (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key text NOT NULL, value jsonb NOT NULL, effective_from date NOT NULL,
  approved_by text, recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE operations.upload (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sha256 text NOT NULL, storage_key text NOT NULL UNIQUE, media_type text NOT NULL,
  byte_size bigint NOT NULL CHECK(byte_size > 0), uploaded_by text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE operations.import_job (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  upload_id bigint NOT NULL REFERENCES operations.upload(id),
  requested_by text NOT NULL, request_key text NOT NULL,
  status text NOT NULL CHECK(status IN ('queued','processing','needs_review','failed','committed','cancelled')),
  expected_revision bigint, committed_revision bigint, candidate jsonb,
  error_code text, attempts integer NOT NULL DEFAULT 0,
  heartbeat_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(requested_by,request_key)
);
CREATE TABLE operations.publication (
  revision bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  snapshot jsonb NOT NULL, source_watermarks jsonb NOT NULL,
  rule_version text NOT NULL, generated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE operations.import_job ADD CONSTRAINT import_committed_revision_fk
  FOREIGN KEY(committed_revision) REFERENCES operations.publication(revision);
CREATE TABLE operations.publication_head (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  revision bigint NOT NULL REFERENCES operations.publication(revision)
);
CREATE TABLE operations.outbox (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  revision bigint NOT NULL REFERENCES operations.publication(revision),
  event_type text NOT NULL DEFAULT 'revision-published',
  metric_ids text[] NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE operations.audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id text NOT NULL, action text NOT NULL, target text NOT NULL,
  before_revision bigint, after_revision bigint, reason text,
  request_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE operations.rank_lock (
  department_id text NOT NULL, month date NOT NULL CHECK(extract(day FROM month)=1),
  version integer NOT NULL CHECK(version > 0),
  revision bigint NOT NULL REFERENCES operations.publication(revision),
  rule_version text NOT NULL, snapshot jsonb NOT NULL,
  approved_by text NOT NULL, approved_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL, PRIMARY KEY(department_id,month,version)
);
COMMIT;
-- Deployment must add restricted app/worker/read roles, permissions and retention.
-- fact_head must reference an accepted revision of the SAME event_key: enforce in
-- service transaction and integration tests (or add a constraint trigger).
-- upload sha can repeat under separate authorized jobs: idempotency is scoped,
-- preventing one user's upload hash from exposing another user's file metadata.
