/*
# WhittleScript — Consolidate Role System

Remove the redundant role_enrollments table. The user_roles table is the
single source of truth for role management, with created_at serving as
the enrollment timestamp.
*/

-- Migrate any data from role_enrollments into user_roles (in case any
-- enrollment exists without a corresponding user_roles entry)
INSERT INTO user_roles (user_id, role, is_active, verification_status)
SELECT re.user_id, re.role, false, 'unverified'
FROM role_enrollments re
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles ur
  WHERE ur.user_id = re.user_id AND ur.role = re.role
)
ON CONFLICT DO NOTHING;

-- Drop the redundant table
DROP TABLE IF EXISTS role_enrollments CASCADE;
