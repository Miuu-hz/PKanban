-- Migration 001: members, organizations, org_members, org_invites
-- Run AFTER Planka has initialized its own tables in the same DB.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- LINE users
CREATE TABLE IF NOT EXISTS members (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id   VARCHAR(50) UNIQUE NOT NULL,
  display_name   VARCHAR(100),
  picture_url    TEXT,
  email          VARCHAR(150),
  ical_token     VARCHAR(64) UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  planka_user_id VARCHAR(50),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Organizations (one per SME business)
CREATE TABLE IF NOT EXISTS organizations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(100) NOT NULL,
  slug              VARCHAR(50)  UNIQUE NOT NULL,
  owner_id          UUID        REFERENCES members(id),
  plan              VARCHAR(20)  DEFAULT 'free',
  planka_project_id VARCHAR(50),
  done_list_id      VARCHAR(50),
  office_lat        DECIMAL(10,7),
  office_lng        DECIMAL(10,7),
  office_radius_m   INTEGER      DEFAULT 300,
  allow_remote      BOOLEAN      DEFAULT false,
  created_at        TIMESTAMPTZ  DEFAULT NOW()
);

-- Membership + roles
CREATE TABLE IF NOT EXISTS org_members (
  org_id     UUID REFERENCES organizations(id) ON DELETE CASCADE,
  member_id  UUID REFERENCES members(id)       ON DELETE CASCADE,
  role       VARCHAR(20) DEFAULT 'member',
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (org_id, member_id)
);

-- Invite tokens
CREATE TABLE IF NOT EXISTS org_invites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        REFERENCES organizations(id) ON DELETE CASCADE,
  token       VARCHAR(64) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  role        VARCHAR(20) DEFAULT 'member',
  created_by  UUID        REFERENCES members(id),
  expires_at  TIMESTAMPTZ DEFAULT NOW() + INTERVAL '72 hours',
  used_by     UUID        REFERENCES members(id),
  used_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_org_members_member ON org_members(member_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_token  ON org_invites(token);
