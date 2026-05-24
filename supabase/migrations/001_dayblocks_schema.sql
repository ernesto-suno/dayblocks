-- DayBlocks schema migration
-- Run this in Supabase Dashboard → SQL Editor

-- Enable uuid extension (usually already enabled)
create extension if not exists "uuid-ossp";

-- ─── tasks ────────────────────────────────────────────────────────────────────

create table if not exists public.tasks (
  id                   uuid primary key default uuid_generate_v4(),
  title                text not null,
  notes                text,
  status               text not null default 'backlog'
                         check (status in ('backlog', 'scheduled', 'completed', 'skipped')),
  priority             text not null default 'medium'
                         check (priority in ('high', 'medium', 'low')),
  estimated_minutes    integer,
  actual_minutes       integer,
  scheduled_date       date,
  scheduled_start_time time,
  calendar_event_id    text,
  completed_at         timestamptz,
  rollover_count       integer not null default 0,
  subtasks             jsonb,
  created_at           timestamptz not null default now()
);

-- Index for common queries
create index if not exists tasks_status_idx         on public.tasks (status);
create index if not exists tasks_scheduled_date_idx on public.tasks (scheduled_date);
create index if not exists tasks_completed_at_idx   on public.tasks (completed_at desc);

-- ─── time_entries ──────────────────────────────────────────────────────────────

create table if not exists public.time_entries (
  id               uuid primary key default uuid_generate_v4(),
  task_id          uuid not null references public.tasks (id) on delete cascade,
  started_at       timestamptz not null,
  ended_at         timestamptz,
  duration_minutes integer
);

create index if not exists time_entries_task_id_idx on public.time_entries (task_id);

-- ─── Row Level Security ────────────────────────────────────────────────────────
-- Note: For a single-user / single-tenant app, you can keep RLS simple.
-- If you want per-user isolation later, add a user_id column and policies.

alter table public.tasks        enable row level security;
alter table public.time_entries enable row level security;

-- Allow all operations for authenticated users (single-tenant SSO)
create policy "Allow all for authenticated users" on public.tasks
  for all using (auth.role() = 'authenticated');

create policy "Allow all for authenticated users" on public.time_entries
  for all using (auth.role() = 'authenticated');
