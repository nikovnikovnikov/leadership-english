-- Migration 0015: Invites, user access tracking, subscription tiers

-- 1. Invites table
CREATE TABLE IF NOT EXISTS invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL UNIQUE,
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  used_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at    timestamptz
);

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read invites (to validate codes)
CREATE POLICY "Authenticated users can read invites"
  ON invites FOR SELECT
  TO authenticated
  USING (true);

-- Users can create their own invites
CREATE POLICY "Users can create invites"
  ON invites FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

-- Users can claim an unused invite (set used_by to themselves)
CREATE POLICY "Users can claim unused invites"
  ON invites FOR UPDATE
  TO authenticated
  USING (used_by IS NULL)
  WITH CHECK (used_by = auth.uid());

-- 2. User access table — tracks how each user gained access
CREATE TABLE IF NOT EXISTS user_access (
  user_id     uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  access_type text NOT NULL CHECK (access_type IN ('beta', 'invite', 'subscription', 'open')),
  invite_id   uuid REFERENCES invites(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_access ENABLE ROW LEVEL SECURITY;

-- Users can read their own access record
CREATE POLICY "Users can read own access"
  ON user_access FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all
CREATE POLICY "Admins can read all access"
  ON user_access FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Users can insert their own access record (during setup)
CREATE POLICY "Users can insert own access"
  ON user_access FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can insert any access record
CREATE POLICY "Admins can insert any access"
  ON user_access FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Admins can update any access record (for subscription webhook)
CREATE POLICY "Admins can update any access"
  ON user_access FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. Onboarding settings
INSERT INTO settings (key, value) VALUES
  ('beta_mode', 'false'),
  ('beta_max_spots', '10'),
  ('invites_enabled', 'false'),
  ('invites_per_member', '3'),
  ('subscription_required', 'false'),
  ('stripe_price_monthly', ''),
  ('stripe_price_yearly', ''),
  ('yearly_enabled', 'false')
ON CONFLICT (key) DO NOTHING;
