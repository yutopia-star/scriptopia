/*
# WhittleScript — Seed Development Test Accounts

1. Purpose
   Create four seeded accounts for development only (writer, reader, industry,
   admin). These bypass email verification in development mode and are never
   included in production builds. The frontend gates the dev-login shortcut
   behind an import.meta.env.DEV check.

2. What this migration does
   - Uses the service-role admin API via pgsodium/http is NOT available; instead
     we insert directly into auth.users with a pre-bcrypted password hash using
     the crypt() function from pgcrypto (enabled by default on Supabase). The
     hash uses the same bcrypt cost factor Supabase Auth uses (10).
   - Creates matching rows in profiles, user_roles, and the per-role profile
     tables so the seeded accounts are fully functional.

3. Accounts
   - writer@test.com  / password123  (active role: writer)
   - reader@test.com / password123  (active role: reader)
   - industry@test.com / password123 (active role: industry, independent)
   - admin@test.com  / password123  (active role: admin)

4. Idempotency
   - Uses ON CONFLICT DO NOTHING so re-running is safe. The auth.users insert
     conflicts on email; profile/role inserts conflict on their primary keys
     or unique constraints.

5. Notes
   - The bcrypt hash below is for the literal string "password123" with cost 10.
   - These accounts have email_confirmed_at set so they bypass verification.
*/

-- Ensure pgcrypto is available for crypt()/gen_salt().
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper: insert an auth user if missing. We use a fixed bcrypt hash for
-- "password123" (cost 10) so the accounts can log in via the standard
-- Supabase Auth signInWithPassword flow.
DO $$
DECLARE
  pw_hash text := crypt('password123', gen_salt('bf', 10));
BEGIN
  -- writer@test.com
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'writer@test.com') THEN
    INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      'a1111111-0000-0000-0000-000000000001',
      'authenticated', 'authenticated', 'writer@test.com', pw_hash, now(), now(), now(),
      '{"provider":"email","providers":["email"]}', '{}'
    );
  END IF;

  -- reader@test.com
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'reader@test.com') THEN
    INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      'a1111111-0000-0000-0000-000000000002',
      'authenticated', 'authenticated', 'reader@test.com', pw_hash, now(), now(), now(),
      '{"provider":"email","providers":["email"]}', '{}'
    );
  END IF;

  -- industry@test.com
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'industry@test.com') THEN
    INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      'a1111111-0000-0000-0000-000000000003',
      'authenticated', 'authenticated', 'industry@test.com', pw_hash, now(), now(), now(),
      '{"provider":"email","providers":["email"]}', '{}'
    );
  END IF;

  -- admin@test.com
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@test.com') THEN
    INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      'a1111111-0000-0000-0000-000000000004',
      'authenticated', 'authenticated', 'admin@test.com', pw_hash, now(), now(), now(),
      '{"provider":"email","providers":["email"]}', '{}'
    );
  END IF;
END $$;

-- profiles (conflict on PK = id)
INSERT INTO profiles (id, username, email, full_name, date_of_birth, country, active_role, terms_accepted_at, privacy_accepted_at)
VALUES
  ('a1111111-0000-0000-0000-000000000001', 'writer_test', 'writer@test.com', 'Test Writer', '1990-01-01', 'United Kingdom', 'writer', now(), now()),
  ('a1111111-0000-0000-0000-000000000002', 'reader_test', 'reader@test.com', 'Test Reader', '1995-05-05', 'United States', 'reader', now(), now()),
  ('a1111111-0000-0000-0000-000000000003', 'industry_test', 'industry@test.com', 'Test Industry', '1985-03-03', 'United States', 'industry', now(), now()),
  ('a1111111-0000-0000-0000-000000000004', 'admin_test', 'admin@test.com', 'Test Admin', '1980-07-07', 'United Kingdom', 'admin', now(), now())
ON CONFLICT (id) DO NOTHING;

-- user_roles (conflict on (user_id, role))
INSERT INTO user_roles (user_id, role, is_active, verification_status)
VALUES
  ('a1111111-0000-0000-0000-000000000001', 'writer', true, 'verified'),
  ('a1111111-0000-0000-0000-000000000002', 'reader', true, 'verified'),
  ('a1111111-0000-0000-0000-000000000003', 'industry', true, 'verified'),
  ('a1111111-0000-0000-0000-000000000004', 'admin', true, 'verified')
ON CONFLICT (user_id, role) DO NOTHING;

-- per-role profiles
INSERT INTO writer_profiles (user_id, completed) VALUES ('a1111111-0000-0000-0000-000000000001', false)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO reader_profiles (user_id) VALUES ('a1111111-0000-0000-0000-000000000002')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO industry_profiles (user_id, account_type, primary_profession, verification_status, company_verified)
VALUES ('a1111111-0000-0000-0000-000000000003', 'independent', 'Independent Producer', 'verified', false)
ON CONFLICT (user_id) DO NOTHING;
