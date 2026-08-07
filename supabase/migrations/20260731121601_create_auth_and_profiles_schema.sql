/*
# WhittleScript — Authentication & Profiles Schema

1. Purpose
   Foundation for a multi-role screenplay engagement platform. Authentication is
   handled by Supabase Auth (auth.users). All application profile data lives in
   separate tables so additional auth providers (Google, Apple, LinkedIn) can be
   added later without redesigning the system.

2. Enums
   - app_role: 'writer' | 'reader' | 'industry' | 'admin'
   - industry_account_type: 'company' | 'independent'
   - industry_role_kind: dropdown values for company reps
   - primary_profession_kind: independent-specific profession values
   - verification_status: 'unverified' | 'pending' | 'verified' | 'rejected'

3. New Tables
   - profiles: one row per auth user. Stores username, email, country, dob, and
     the user's current/active role for routing. Username + email are unique.
   - user_roles: many rows per user. A user can hold multiple roles
     (writer + reader + industry + admin). Each row tracks verification status
     and whether that role is the user's active role. This lets a user add/change
     roles later without losing per-role data.
   - writer_profiles: writer-specific profile data (completed after sign-in).
   - reader_profiles: reader-specific profile data.
   - industry_profiles: industry-specific profile data. Holds the account
     type (company/independent), company fields, optional fields, and the
     "Company Verified" badge state.

4. Security
   - RLS enabled on every table.
   - profiles: owner can SELECT/INSERT/UPDATE their own row. No DELETE.
   - user_roles: owner can SELECT/INSERT/UPDATE/DELETE their own rows.
   - *_profiles: owner can SELECT/INSERT/UPDATE their own rows.
   - All policies use auth.uid() ownership checks.

5. Notes
   - Owner columns default to auth.uid() so frontend inserts that omit the
     owner still satisfy WITH CHECK policies.
   - ON DELETE CASCADE keeps child profiles in sync if an auth user is removed.
   - created_at/updated_at timestamps on all tables.
   - Industry "Company Verified" is driven by verification_status on the
     industry_profiles row; no manual admin approval is required.
*/

-- ---- Enums ----
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('writer', 'reader', 'industry', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE industry_account_type AS ENUM ('company', 'independent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE industry_role_kind AS ENUM (
    'Producer',
    'Executive Producer',
    'Development Executive',
    'Script Editor',
    'Literary Manager',
    'Agent',
    'Director',
    'Acquisitions Executive',
    'Broadcaster',
    'Streaming Executive',
    'Distributor',
    'Sales Agent',
    'Festival Programmer',
    'Investor',
    'Other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE primary_profession_kind AS ENUM (
    'Independent Producer',
    'Director',
    'Writer-Director',
    'Executive Producer',
    'Development Consultant',
    'Script Consultant',
    'Casting Director',
    'Sales Agent',
    'Financier',
    'Other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---- profiles ----
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  full_name text,
  date_of_birth date NOT NULL,
  country text NOT NULL,
  active_role app_role NOT NULL DEFAULT 'reader',
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ---- user_roles ----
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  verification_status verification_status NOT NULL DEFAULT 'unverified',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_select_own" ON user_roles;
CREATE POLICY "user_roles_select_own" ON user_roles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_roles_insert_own" ON user_roles;
CREATE POLICY "user_roles_insert_own" ON user_roles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_roles_update_own" ON user_roles;
CREATE POLICY "user_roles_update_own" ON user_roles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_roles_delete_own" ON user_roles;
CREATE POLICY "user_roles_delete_own" ON user_roles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---- writer_profiles ----
CREATE TABLE IF NOT EXISTS writer_profiles (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  bio text,
  city text,
  website text,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE writer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "writer_profiles_select_own" ON writer_profiles;
CREATE POLICY "writer_profiles_select_own" ON writer_profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "writer_profiles_insert_own" ON writer_profiles;
CREATE POLICY "writer_profiles_insert_own" ON writer_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "writer_profiles_update_own" ON writer_profiles;
CREATE POLICY "writer_profiles_update_own" ON writer_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---- reader_profiles ----
CREATE TABLE IF NOT EXISTS reader_profiles (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  bio text,
  city text,
  reputation_score integer NOT NULL DEFAULT 0,
  reviews_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reader_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reader_profiles_select_own" ON reader_profiles;
CREATE POLICY "reader_profiles_select_own" ON reader_profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "reader_profiles_insert_own" ON reader_profiles;
CREATE POLICY "reader_profiles_insert_own" ON reader_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reader_profiles_update_own" ON reader_profiles;
CREATE POLICY "reader_profiles_update_own" ON reader_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---- industry_profiles ----
CREATE TABLE IF NOT EXISTS industry_profiles (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type industry_account_type NOT NULL,
  job_title text,
  company_name text,
  company_website text,
  industry_role industry_role_kind,
  primary_profession primary_profession_kind,
  linkedin_url text,
  imdb_url text,
  personal_website text,
  portfolio_website text,
  years_in_industry integer,
  genres_of_interest text[],
  preferred_budget_range text,
  project_types_seeking text[],
  bio text,
  city text,
  verification_status verification_status NOT NULL DEFAULT 'unverified',
  company_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE industry_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "industry_profiles_select_own" ON industry_profiles;
CREATE POLICY "industry_profiles_select_own" ON industry_profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "industry_profiles_insert_own" ON industry_profiles;
CREATE POLICY "industry_profiles_insert_own" ON industry_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "industry_profiles_update_own" ON industry_profiles;
CREATE POLICY "industry_profiles_update_own" ON industry_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---- updated_at trigger helper ----
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_touch_updated_at ON profiles;
CREATE TRIGGER profiles_touch_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS user_roles_touch_updated_at ON user_roles;
CREATE TRIGGER user_roles_touch_updated_at BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS writer_profiles_touch_updated_at ON writer_profiles;
CREATE TRIGGER writer_profiles_touch_updated_at BEFORE UPDATE ON writer_profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS reader_profiles_touch_updated_at ON reader_profiles;
CREATE TRIGGER reader_profiles_touch_updated_at BEFORE UPDATE ON reader_profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS industry_profiles_touch_updated_at ON industry_profiles;
CREATE TRIGGER industry_profiles_touch_updated_at BEFORE UPDATE ON industry_profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ---- Indexes ----
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(user_id, is_active);
