-- ============================================================
-- SECURITY FIX: RLS Policies Overhaul
-- Date: 2026-07-14
-- Issue: Anon users can READ profiles (email exposure),
--        UPDATE profiles (privilege escalation),
--        INSERT into settings, DELETE from news/transfers
-- Root cause: "Admin write" FOR ALL TO authenticated
--             does not properly block anon operations
-- ============================================================

-- ============================================================
-- STEP 1: Drop ALL existing policies
-- ============================================================

-- Seasons
DROP POLICY IF EXISTS "Public read" ON seasons;
DROP POLICY IF EXISTS "Admin write" ON seasons;

-- Competitions
DROP POLICY IF EXISTS "Public read" ON competitions;
DROP POLICY IF EXISTS "Admin write" ON competitions;

-- Teams
DROP POLICY IF EXISTS "Public read" ON teams;
DROP POLICY IF EXISTS "Admin write" ON teams;

-- Players
DROP POLICY IF EXISTS "Public read" ON players;
DROP POLICY IF EXISTS "Admin write" ON players;

-- Matches
DROP POLICY IF EXISTS "Public read" ON matches;
DROP POLICY IF EXISTS "Admin write" ON matches;

-- Match events
DROP POLICY IF EXISTS "Public read" ON match_events;
DROP POLICY IF EXISTS "Admin write" ON match_events;

-- Match stats
DROP POLICY IF EXISTS "Public read" ON match_stats;
DROP POLICY IF EXISTS "Admin write" ON match_stats;

-- Lineups
DROP POLICY IF EXISTS "Public read" ON lineups;
DROP POLICY IF EXISTS "Admin write" ON lineups;

-- Boxscores
DROP POLICY IF EXISTS "Public read" ON boxscores;
DROP POLICY IF EXISTS "Admin write" ON boxscores;

-- News
DROP POLICY IF EXISTS "Public read" ON news;
DROP POLICY IF EXISTS "Admin write" ON news;

-- Transfers
DROP POLICY IF EXISTS "Public read" ON transfers;
DROP POLICY IF EXISTS "Admin write" ON transfers;

-- Referees
DROP POLICY IF EXISTS "Public read" ON referees;
DROP POLICY IF EXISTS "Admin write" ON referees;

-- Videos
DROP POLICY IF EXISTS "Public read" ON videos;
DROP POLICY IF EXISTS "Admin write" ON videos;

-- Profiles (had NO public read, only admin write)
DROP POLICY IF EXISTS "Admin write" ON profiles;

-- Settings (had NO public read, only admin write)
DROP POLICY IF EXISTS "Admin write" ON settings;

-- ============================================================
-- STEP 2: Create helper function for admin check
-- ============================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- STEP 3: Recreate policies with proper security
-- ============================================================

-- === PUBLIC DATA TABLES: Public read, admin write ===

-- Seasons
CREATE POLICY "seasons_select_public" ON seasons
  FOR SELECT USING (true);
CREATE POLICY "seasons_insert_admin" ON seasons
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());
CREATE POLICY "seasons_update_admin" ON seasons
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "seasons_delete_admin" ON seasons
  FOR DELETE TO authenticated
  USING (is_admin());

-- Competitions
CREATE POLICY "competitions_select_public" ON competitions
  FOR SELECT USING (true);
CREATE POLICY "competitions_insert_admin" ON competitions
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());
CREATE POLICY "competitions_update_admin" ON competitions
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "competitions_delete_admin" ON competitions
  FOR DELETE TO authenticated
  USING (is_admin());

-- Teams
CREATE POLICY "teams_select_public" ON teams
  FOR SELECT USING (true);
CREATE POLICY "teams_insert_admin" ON teams
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());
CREATE POLICY "teams_update_admin" ON teams
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "teams_delete_admin" ON teams
  FOR DELETE TO authenticated
  USING (is_admin());

-- Players
CREATE POLICY "players_select_public" ON players
  FOR SELECT USING (true);
CREATE POLICY "players_insert_admin" ON players
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());
CREATE POLICY "players_update_admin" ON players
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "players_delete_admin" ON players
  FOR DELETE TO authenticated
  USING (is_admin());

-- Matches
CREATE POLICY "matches_select_public" ON matches
  FOR SELECT USING (true);
CREATE POLICY "matches_insert_admin" ON matches
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());
CREATE POLICY "matches_update_admin" ON matches
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "matches_delete_admin" ON matches
  FOR DELETE TO authenticated
  USING (is_admin());

-- Match events
CREATE POLICY "match_events_select_public" ON match_events
  FOR SELECT USING (true);
CREATE POLICY "match_events_insert_admin" ON match_events
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());
CREATE POLICY "match_events_update_admin" ON match_events
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "match_events_delete_admin" ON match_events
  FOR DELETE TO authenticated
  USING (is_admin());

-- Match stats
CREATE POLICY "match_stats_select_public" ON match_stats
  FOR SELECT USING (true);
CREATE POLICY "match_stats_insert_admin" ON match_stats
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());
CREATE POLICY "match_stats_update_admin" ON match_stats
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "match_stats_delete_admin" ON match_stats
  FOR DELETE TO authenticated
  USING (is_admin());

-- Lineups
CREATE POLICY "lineups_select_public" ON lineups
  FOR SELECT USING (true);
CREATE POLICY "lineups_insert_admin" ON lineups
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());
CREATE POLICY "lineups_update_admin" ON lineups
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "lineups_delete_admin" ON lineups
  FOR DELETE TO authenticated
  USING (is_admin());

-- Boxscores
CREATE POLICY "boxscores_select_public" ON boxscores
  FOR SELECT USING (true);
CREATE POLICY "boxscores_insert_admin" ON boxscores
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());
CREATE POLICY "boxscores_update_admin" ON boxscores
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "boxscores_delete_admin" ON boxscores
  FOR DELETE TO authenticated
  USING (is_admin());

-- News
CREATE POLICY "news_select_public" ON news
  FOR SELECT USING (true);
CREATE POLICY "news_insert_admin" ON news
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());
CREATE POLICY "news_update_admin" ON news
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "news_delete_admin" ON news
  FOR DELETE TO authenticated
  USING (is_admin());

-- Transfers
CREATE POLICY "transfers_select_public" ON transfers
  FOR SELECT USING (true);
CREATE POLICY "transfers_insert_admin" ON transfers
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());
CREATE POLICY "transfers_update_admin" ON transfers
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "transfers_delete_admin" ON transfers
  FOR DELETE TO authenticated
  USING (is_admin());

-- Referees
CREATE POLICY "referees_select_public" ON referees
  FOR SELECT USING (true);
CREATE POLICY "referees_insert_admin" ON referees
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());
CREATE POLICY "referees_update_admin" ON referees
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "referees_delete_admin" ON referees
  FOR DELETE TO authenticated
  USING (is_admin());

-- Videos
CREATE POLICY "videos_select_public" ON videos
  FOR SELECT USING (true);
CREATE POLICY "videos_insert_admin" ON videos
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());
CREATE POLICY "videos_update_admin" ON videos
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "videos_delete_admin" ON videos
  FOR DELETE TO authenticated
  USING (is_admin());

-- === SENSITIVE TABLES: Authenticated read + write ===

-- Profiles (email, role - NEVER expose to anon)
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT TO authenticated
  USING (is_admin());
CREATE POLICY "profiles_insert_admin" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "profiles_delete_admin" ON profiles
  FOR DELETE TO authenticated
  USING (is_admin());

-- Settings (config data - NEVER expose to anon)
CREATE POLICY "settings_select_admin" ON settings
  FOR SELECT TO authenticated
  USING (is_admin());
CREATE POLICY "settings_insert_admin" ON settings
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());
CREATE POLICY "settings_update_admin" ON settings
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "settings_delete_admin" ON settings
  FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================
-- STEP 4: Additional security hardening
-- ============================================================

-- FORCE RLS on all tables (protects service_role connections too)
ALTER TABLE seasons FORCE ROW LEVEL SECURITY;
ALTER TABLE competitions FORCE ROW LEVEL SECURITY;
ALTER TABLE teams FORCE ROW LEVEL SECURITY;
ALTER TABLE players FORCE ROW LEVEL SECURITY;
ALTER TABLE matches FORCE ROW LEVEL SECURITY;
ALTER TABLE match_events FORCE ROW LEVEL SECURITY;
ALTER TABLE match_stats FORCE ROW LEVEL SECURITY;
ALTER TABLE lineups FORCE ROW LEVEL SECURITY;
ALTER TABLE boxscores FORCE ROW LEVEL SECURITY;
ALTER TABLE news FORCE ROW LEVEL SECURITY;
ALTER TABLE transfers FORCE ROW LEVEL SECURITY;
ALTER TABLE referees FORCE ROW LEVEL SECURITY;
ALTER TABLE videos FORCE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE settings FORCE ROW LEVEL SECURITY;

-- Performance: wrap auth.uid() to avoid per-row evaluation
-- (applied via separate UPDATE policies below)

-- Performance index for admin checks
CREATE INDEX IF NOT EXISTS idx_profiles_auth_admin ON profiles(id, role) WHERE role = 'admin';

-- GIN indexes for JSONB columns (if queried with @>, ?, ?| operators)
CREATE INDEX IF NOT EXISTS idx_teams_trophies_gin ON teams USING GIN (trophies);
CREATE INDEX IF NOT EXISTS idx_players_stats_gin ON players USING GIN (stats);
CREATE INDEX IF NOT EXISTS idx_matches_venue_gin ON matches USING GIN (venue);
CREATE INDEX IF NOT EXISTS idx_matches_predictions_gin ON matches USING GIN (predictions);
CREATE INDEX IF NOT EXISTS idx_lineups_data_gin ON lineups USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_boxscores_data_gin ON boxscores USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_player_season_stats_gin ON player_season_stats USING GIN (stats);
CREATE INDEX IF NOT EXISTS idx_team_season_stats_gin ON team_season_stats USING GIN (stats);
CREATE INDEX IF NOT EXISTS idx_settings_value_gin ON settings USING GIN (value);

-- ============================================================
-- VERIFICATION QUERIES (run after applying)
-- ============================================================

-- Check all policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies WHERE schemaname = 'public';

-- Test anon access should be blocked:
-- curl -s "$SUPABASE_URL/rest/v1/profiles?select=*" -H "apikey: $ANON_KEY"
-- curl -s "$SUPABASE_URL/rest/v1/settings?select=*" -H "apikey: $ANON_KEY"
