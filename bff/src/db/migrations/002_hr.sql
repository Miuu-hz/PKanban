-- Migration 002: HR tables (check-in, worklog, evaluation, leave)

CREATE TABLE IF NOT EXISTS hr_checkins (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        REFERENCES organizations(id) ON DELETE CASCADE,
  member_id   UUID        REFERENCES members(id)       ON DELETE CASCADE,
  type        VARCHAR(10) NOT NULL CHECK (type IN ('in','out')),
  lat         DECIMAL(10,7),
  lng         DECIMAL(10,7),
  note        VARCHAR(200),
  checked_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_worklog (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        REFERENCES organizations(id) ON DELETE CASCADE,
  member_id   UUID        REFERENCES members(id)       ON DELETE CASCADE,
  card_id     VARCHAR(50) NOT NULL,
  hours       DECIMAL(5,2) NOT NULL CHECK (hours > 0),
  note        VARCHAR(300),
  logged_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_evaluations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID        REFERENCES organizations(id) ON DELETE CASCADE,
  member_id     UUID        REFERENCES members(id)       ON DELETE CASCADE,
  card_id       VARCHAR(50) NOT NULL,
  card_title    VARCHAR(200),
  due_date      TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  on_time       BOOLEAN,
  hours_spent   DECIMAL(6,2),
  period        CHAR(7),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (card_id, member_id)
);

CREATE TABLE IF NOT EXISTS hr_leave (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        REFERENCES organizations(id) ON DELETE CASCADE,
  member_id    UUID        REFERENCES members(id)       ON DELETE CASCADE,
  leave_type   VARCHAR(30) DEFAULT 'annual',
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  reason       VARCHAR(300),
  status       VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by  UUID        REFERENCES members(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_checkins_member_date ON hr_checkins(member_id, checked_at);
CREATE INDEX IF NOT EXISTS idx_worklog_card         ON hr_worklog(card_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_period   ON hr_evaluations(member_id, period);
CREATE INDEX IF NOT EXISTS idx_leave_member         ON hr_leave(member_id, status);
