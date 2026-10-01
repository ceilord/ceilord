ALTER TABLE beta_signups
  ADD COLUMN notice_version TEXT NOT NULL DEFAULT 'pre-notice';

ALTER TABLE beta_signups
  ADD COLUMN consented_at TEXT NOT NULL DEFAULT 'unknown';
