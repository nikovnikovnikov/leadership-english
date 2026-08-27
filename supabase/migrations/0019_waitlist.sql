-- Waitlist table for gated community access
CREATE TABLE IF NOT EXISTS waitlist (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL UNIQUE,
  position    bigint GENERATED ALWAYS AS IDENTITY,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'admitted', 'declined')),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  admitted_at timestamptz
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can insert to join the waitlist
CREATE POLICY "Anyone can join waitlist"
  ON waitlist FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read the waitlist
CREATE POLICY "Admins can read waitlist"
  ON waitlist FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update waitlist entries (admit/decline)
CREATE POLICY "Admins can update waitlist"
  ON waitlist FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (true);

-- Only admins can delete waitlist entries
CREATE POLICY "Admins can delete waitlist"
  ON waitlist FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
