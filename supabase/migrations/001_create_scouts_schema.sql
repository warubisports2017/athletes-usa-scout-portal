-- Scout Portal Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/wwomwawpxmkrykybpqok/sql

-- =====================
-- 1. SCOUTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS scouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  commission_type TEXT DEFAULT 'fixed',
  commission_rate DECIMAL,
  commission_notes TEXT,
  status TEXT DEFAULT 'active',
  verified_since DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 2. ADD REFERRAL COLUMN TO ATHLETES
-- =====================
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS referred_by_scout_id UUID REFERENCES scouts(id);
CREATE INDEX IF NOT EXISTS idx_athletes_referred_by ON athletes(referred_by_scout_id);

-- =====================
-- 3. SCOUT COMMISSIONS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS scout_commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scout_id UUID NOT NULL REFERENCES scouts(id),
  athlete_id UUID NOT NULL REFERENCES athletes(id),
  amount DECIMAL NOT NULL,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scout_id, athlete_id)
);

-- =====================
-- 4. SCOUT RESOURCES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS scout_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  file_url TEXT,
  file_type TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 5. SCOUT NOTIFICATION PREFERENCES
-- =====================
CREATE TABLE IF NOT EXISTS scout_notification_prefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scout_id UUID NOT NULL REFERENCES scouts(id),
  email_new_lead BOOLEAN DEFAULT true,
  email_status_change BOOLEAN DEFAULT true,
  email_placed BOOLEAN DEFAULT true,
  email_commission_paid BOOLEAN DEFAULT true,
  email_new_resources BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT false,
  UNIQUE(scout_id)
);

-- =====================
-- 6. ENABLE ROW LEVEL SECURITY
-- =====================
ALTER TABLE scouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_notification_prefs ENABLE ROW LEVEL SECURITY;

-- =====================
-- 7. RLS POLICIES
-- =====================

-- Scouts can view and update their own record
CREATE POLICY "Scouts can view own record" ON scouts
  FOR SELECT USING (auth.uid()::text = id::text OR auth.jwt() ->> 'email' = email);

CREATE POLICY "Scouts can update own record" ON scouts
  FOR UPDATE USING (auth.uid()::text = id::text OR auth.jwt() ->> 'email' = email);

-- Scouts can see their own commissions
CREATE POLICY "Scouts can view own commissions" ON scout_commissions
  FOR SELECT USING (scout_id IN (SELECT id FROM scouts WHERE auth.jwt() ->> 'email' = email));

-- Scouts can manage their notification prefs
CREATE POLICY "Scouts can view own notification prefs" ON scout_notification_prefs
  FOR SELECT USING (scout_id IN (SELECT id FROM scouts WHERE auth.jwt() ->> 'email' = email));

CREATE POLICY "Scouts can update own notification prefs" ON scout_notification_prefs
  FOR UPDATE USING (scout_id IN (SELECT id FROM scouts WHERE auth.jwt() ->> 'email' = email));

CREATE POLICY "Scouts can insert own notification prefs" ON scout_notification_prefs
  FOR INSERT WITH CHECK (scout_id IN (SELECT id FROM scouts WHERE auth.jwt() ->> 'email' = email));

-- Scouts can read athletes they referred
CREATE POLICY "Scouts can view referred athletes" ON athletes
  FOR SELECT USING (
    referred_by_scout_id IN (SELECT id FROM scouts WHERE auth.jwt() ->> 'email' = email)
    OR referred_by_scout_id IS NULL
  );

-- Public can read resources
CREATE POLICY "Anyone can view resources" ON scout_resources
  FOR SELECT USING (true);
