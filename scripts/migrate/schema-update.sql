-- Update existing STPLS database to support rich match data and aggregated stats
-- Run this in Supabase SQL Editor

-- 1. Update matches table
ALTER TABLE matches ALTER COLUMN venue TYPE JSONB USING venue::JSONB;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS predictions JSONB;

-- 2. Recreate match_events with richer schema (table is empty in existing migrations)
DROP TABLE IF EXISTS match_events CASCADE;
CREATE TABLE match_events (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    time TEXT,
    type TEXT NOT NULL,
    player TEXT,
    player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    substituted TEXT,
    substituted_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    assist TEXT,
    team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_match_events_match ON match_events(match_id);
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON match_events FOR SELECT USING (true);
CREATE POLICY "Admin write" ON match_events FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. Recreate match_stats (table is empty)
DROP TABLE IF EXISTS match_stats CASCADE;
CREATE TABLE match_stats (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    value_home TEXT,
    value_away TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_match_stats_match ON match_stats(match_id);
ALTER TABLE match_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON match_stats FOR SELECT USING (true);
CREATE POLICY "Admin write" ON match_stats FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4. Recreate lineups as JSONB store
DROP TABLE IF EXISTS lineups CASCADE;
CREATE TABLE lineups (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_lineups_match ON lineups(match_id);
ALTER TABLE lineups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON lineups FOR SELECT USING (true);
CREATE POLICY "Admin write" ON lineups FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 5. Recreate boxscores as JSONB store
DROP TABLE IF EXISTS boxscores CASCADE;
CREATE TABLE boxscores (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_boxscores_match ON boxscores(match_id);
CREATE INDEX idx_boxscores_player ON boxscores(player_id);
ALTER TABLE boxscores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON boxscores FOR SELECT USING (true);
CREATE POLICY "Admin write" ON boxscores FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 6. Aggregated player season stats
CREATE TABLE IF NOT EXISTS player_season_stats (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    competition_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    stats JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(player_id, competition_id)
);
CREATE INDEX IF NOT EXISTS idx_player_season_stats_player ON player_season_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_player_season_stats_competition ON player_season_stats(competition_id);
ALTER TABLE player_season_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON player_season_stats FOR SELECT USING (true);
CREATE POLICY "Admin write" ON player_season_stats FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 7. Add country_code to players
ALTER TABLE players ADD COLUMN IF NOT EXISTS country_code TEXT;

-- 8. Aggregated team season stats
CREATE TABLE IF NOT EXISTS team_season_stats (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    competition_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    stats JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, competition_id)
);
CREATE INDEX IF NOT EXISTS idx_team_season_stats_team ON team_season_stats(team_id);
CREATE INDEX IF NOT EXISTS idx_team_season_stats_competition ON team_season_stats(competition_id);
ALTER TABLE team_season_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON team_season_stats FOR SELECT USING (true);
CREATE POLICY "Admin write" ON team_season_stats FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- 9. SECURITY FIX: Overhaul RLS policies
-- ============================================================
-- Run security-fix-rls.sql separately for clean application,
-- or apply inline below:

-- Helper function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop dangerous old policies
DO $$ BEGIN
  -- Profiles: block anon read/write
  DROP POLICY IF EXISTS "Admin write" ON profiles;
  DROP POLICY IF EXISTS "Public read" ON profiles;
  -- Settings: block anon read/write
  DROP POLICY IF EXISTS "Admin write" ON settings;
  DROP POLICY IF EXISTS "Public read" ON settings;
  -- News/Transfers: block anon delete
  DROP POLICY IF EXISTS "Admin write" ON news;
  DROP POLICY IF EXISTS "Admin write" ON transfers;
  -- All other tables: replace FOR ALL with granular policies
  DROP POLICY IF EXISTS "Admin write" ON seasons;
  DROP POLICY IF EXISTS "Admin write" ON competitions;
  DROP POLICY IF EXISTS "Admin write" ON teams;
  DROP POLICY IF EXISTS "Admin write" ON players;
  DROP POLICY IF EXISTS "Admin write" ON matches;
  DROP POLICY IF EXISTS "Admin write" ON match_events;
  DROP POLICY IF EXISTS "Admin write" ON match_stats;
  DROP POLICY IF EXISTS "Admin write" ON lineups;
  DROP POLICY IF EXISTS "Admin write" ON boxscores;
  DROP POLICY IF EXISTS "Admin write" ON referees;
  DROP POLICY IF EXISTS "Admin write" ON videos;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Profiles: no public read, admin-only
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "profiles_insert_admin" ON profiles FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE TO authenticated USING (is_admin());

-- Settings: no public read, admin-only
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_select_admin" ON settings FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "settings_insert_admin" ON settings FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "settings_update_admin" ON settings FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "settings_delete_admin" ON settings FOR DELETE TO authenticated USING (is_admin());

-- News: admin write (granular)
CREATE POLICY "news_insert_admin" ON news FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "news_update_admin" ON news FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "news_delete_admin" ON news FOR DELETE TO authenticated USING (is_admin());

-- Transfers: admin write (granular)
CREATE POLICY "transfers_insert_admin" ON transfers FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "transfers_update_admin" ON transfers FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "transfers_delete_admin" ON transfers FOR DELETE TO authenticated USING (is_admin());

-- All other public tables: admin write (granular)
DO $$ DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['seasons','competitions','teams','players','matches','match_events','match_stats','lineups','boxscores','referees','videos']) LOOP
    EXECUTE format('CREATE POLICY "%s_insert_admin" ON %I FOR INSERT TO authenticated WITH CHECK (is_admin())', t, t);
    EXECUTE format('CREATE POLICY "%s_update_admin" ON %I FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin())', t, t);
    EXECUTE format('CREATE POLICY "%s_delete_admin" ON %I FOR DELETE TO authenticated USING (is_admin())', t, t);
  END LOOP;
END $$;

-- Performance index
CREATE INDEX IF NOT EXISTS idx_profiles_auth_admin ON profiles(id, role) WHERE role = 'admin';
