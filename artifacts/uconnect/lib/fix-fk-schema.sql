-- Run this in your Supabase SQL Editor to fix FK constraints
-- This allows sample data IDs (like "e1", "i1", "n1", "t1") to work properly

-- Fix event_rsvps: allow text event IDs
ALTER TABLE event_rsvps DROP CONSTRAINT IF EXISTS event_rsvps_event_id_fkey;
ALTER TABLE event_rsvps ALTER COLUMN event_id TYPE text;

-- Fix internship_applications: allow text internship IDs
ALTER TABLE internship_applications DROP CONSTRAINT IF EXISTS internship_applications_internship_id_fkey;
ALTER TABLE internship_applications ALTER COLUMN internship_id TYPE text;

-- Fix note_saves: allow text note IDs
ALTER TABLE note_saves DROP CONSTRAINT IF EXISTS note_saves_note_id_fkey;
ALTER TABLE note_saves ALTER COLUMN note_id TYPE text;

-- Fix team_requests: allow text team IDs
ALTER TABLE team_requests DROP CONSTRAINT IF EXISTS team_requests_team_id_fkey;
ALTER TABLE team_requests ALTER COLUMN team_id TYPE text;
