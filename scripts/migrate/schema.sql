-- STPLS Database Schema
-- Run this SQL in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Seasons
CREATE TABLE IF NOT EXISTS seasons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitions within a season
CREATE TABLE IF NOT EXISTS competitions (
    id TEXT PRIMARY KEY,
    season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    country TEXT,
    external_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT,
    logo_url TEXT,
    stadium TEXT,
    capacity INTEGER,
    founded TEXT,
    web TEXT,
    trophies JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Players
CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    position TEXT,
    shirt_number INTEGER,
    age INTEGER,
    nationality TEXT,
    country_code TEXT,
    photo_url TEXT,
    fotmob_id TEXT,
    stats JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referees
CREATE TABLE IF NOT EXISTS referees (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    college TEXT,
    international BOOLEAN DEFAULT FALSE,
    birth_date TEXT,
    first_date TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches
CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY,
    competition_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    round TEXT NOT NULL,
    jornada INTEGER,
    date TIMESTAMPTZ NOT NULL,
    home_team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    away_team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    home_score INTEGER,
    away_score INTEGER,
    status TEXT,
    venue JSONB,
    referee_id INTEGER REFERENCES referees(id) ON DELETE SET NULL,
    predictions JSONB,
    detail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Match events (goals, cards, substitutions, VAR, etc.)
CREATE TABLE IF NOT EXISTS match_events (
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

-- Match statistics per team (one row per stat category)
CREATE TABLE IF NOT EXISTS match_stats (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    value_home TEXT,
    value_away TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lineups (simplified: store raw JSON for flexibility)
CREATE TABLE IF NOT EXISTS lineups (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Boxscores (player ratings and per-match stats)
CREATE TABLE IF NOT EXISTS boxscores (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregated player season statistics
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

-- Aggregated team season statistics
CREATE TABLE IF NOT EXISTS team_season_stats (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    competition_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    stats JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, competition_id)
);

-- News
CREATE TABLE IF NOT EXISTS news (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    summary TEXT,
    url TEXT,
    image_url TEXT,
    source TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transfers
CREATE TABLE IF NOT EXISTS transfers (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    player_name TEXT NOT NULL,
    type TEXT NOT NULL,
    from_team TEXT,
    to_team TEXT,
    date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Videos
CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
    video_key TEXT NOT NULL UNIQUE,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin profiles (extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings / overrides
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_matches_competition ON matches(competition_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date);
CREATE INDEX IF NOT EXISTS idx_matches_home_team ON matches(home_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_away_team ON matches(away_team_id);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_boxscores_match ON boxscores(match_id);
CREATE INDEX IF NOT EXISTS idx_boxscores_player ON boxscores(player_id);
CREATE INDEX IF NOT EXISTS idx_lineups_match ON lineups(match_id);
CREATE INDEX IF NOT EXISTS idx_match_events_match ON match_events(match_id);
CREATE INDEX IF NOT EXISTS idx_match_stats_match ON match_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_news_team ON news(team_id);
CREATE INDEX IF NOT EXISTS idx_player_season_stats_player ON player_season_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_player_season_stats_competition ON player_season_stats(competition_id);
CREATE INDEX IF NOT EXISTS idx_team_season_stats_team ON team_season_stats(team_id);
CREATE INDEX IF NOT EXISTS idx_team_season_stats_competition ON team_season_stats(competition_id);

-- ============================================================
-- RLS Policies (secure: public read for data, admin-only for writes)
-- ============================================================

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE boxscores ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE referees ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Helper function for admin check (SECURITY DEFINER avoids recursive RLS)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- === PUBLIC DATA: Public read, admin write ===

CREATE POLICY "seasons_select_public" ON seasons FOR SELECT USING (true);
CREATE POLICY "seasons_insert_admin" ON seasons FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "seasons_update_admin" ON seasons FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "seasons_delete_admin" ON seasons FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "competitions_select_public" ON competitions FOR SELECT USING (true);
CREATE POLICY "competitions_insert_admin" ON competitions FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "competitions_update_admin" ON competitions FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "competitions_delete_admin" ON competitions FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "teams_select_public" ON teams FOR SELECT USING (true);
CREATE POLICY "teams_insert_admin" ON teams FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "teams_update_admin" ON teams FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "teams_delete_admin" ON teams FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "players_select_public" ON players FOR SELECT USING (true);
CREATE POLICY "players_insert_admin" ON players FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "players_update_admin" ON players FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "players_delete_admin" ON players FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "matches_select_public" ON matches FOR SELECT USING (true);
CREATE POLICY "matches_insert_admin" ON matches FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "matches_update_admin" ON matches FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "matches_delete_admin" ON matches FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "match_events_select_public" ON match_events FOR SELECT USING (true);
CREATE POLICY "match_events_insert_admin" ON match_events FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "match_events_update_admin" ON match_events FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "match_events_delete_admin" ON match_events FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "match_stats_select_public" ON match_stats FOR SELECT USING (true);
CREATE POLICY "match_stats_insert_admin" ON match_stats FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "match_stats_update_admin" ON match_stats FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "match_stats_delete_admin" ON match_stats FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "lineups_select_public" ON lineups FOR SELECT USING (true);
CREATE POLICY "lineups_insert_admin" ON lineups FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "lineups_update_admin" ON lineups FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "lineups_delete_admin" ON lineups FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "boxscores_select_public" ON boxscores FOR SELECT USING (true);
CREATE POLICY "boxscores_insert_admin" ON boxscores FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "boxscores_update_admin" ON boxscores FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "boxscores_delete_admin" ON boxscores FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "news_select_public" ON news FOR SELECT USING (true);
CREATE POLICY "news_insert_admin" ON news FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "news_update_admin" ON news FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "news_delete_admin" ON news FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "transfers_select_public" ON transfers FOR SELECT USING (true);
CREATE POLICY "transfers_insert_admin" ON transfers FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "transfers_update_admin" ON transfers FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "transfers_delete_admin" ON transfers FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "referees_select_public" ON referees FOR SELECT USING (true);
CREATE POLICY "referees_insert_admin" ON referees FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "referees_update_admin" ON referees FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "referees_delete_admin" ON referees FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "videos_select_public" ON videos FOR SELECT USING (true);
CREATE POLICY "videos_insert_admin" ON videos FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "videos_update_admin" ON videos FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "videos_delete_admin" ON videos FOR DELETE TO authenticated USING (is_admin());

-- === SENSITIVE: No public read, admin only ===

CREATE POLICY "profiles_select_own" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "profiles_insert_admin" ON profiles FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "settings_select_admin" ON settings FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "settings_insert_admin" ON settings FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "settings_update_admin" ON settings FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "settings_delete_admin" ON settings FOR DELETE TO authenticated USING (is_admin());

-- Performance index for admin checks
CREATE INDEX IF NOT EXISTS idx_profiles_auth_admin ON profiles(id, role) WHERE role = 'admin';

