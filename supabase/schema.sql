-- ============================================================
-- TAUK — Schéma Supabase
-- À coller dans l'éditeur SQL de ton projet Supabase
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. GAMES — sessions de jeu
-- ────────────────────────────────────────────────────────────
create table if not exists games (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,       -- code 4 lettres ex: "WKZT"
  mode        text not null default 'taches',
  status      text not null default 'lobby', -- lobby | playing | finished
  host_id     uuid,                       -- référence players.id, set après création
  task_count  integer not null default 7, -- nb de tâches par joueur
  round_count integer not null default 3 check (round_count in (3, 6, 10)),
  created_at  timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- 2. PLAYERS — joueurs dans une partie
-- ────────────────────────────────────────────────────────────
create table if not exists players (
  id          uuid primary key default gen_random_uuid(),
  game_id     uuid not null references games(id) on delete cascade,
  device_id   text not null,              -- identifiant unique de l'appareil
  pseudo      text not null,
  character   text not null,              -- slug: 'choux' | 'avocado' | 'onion' | etc.
  is_host     boolean not null default false,
  is_ready    boolean not null default false,
  score       integer not null default 0,
  joined_at   timestamptz default now(),
  unique (game_id, device_id)             -- un device = un joueur par partie
);

-- Index pour lookup par partie
create index if not exists players_game_id_idx on players(game_id);

-- ────────────────────────────────────────────────────────────
-- 3. TASKS — catalogue de tâches (données de jeu)
-- ────────────────────────────────────────────────────────────
create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  text        text not null,
  mode        text not null default 'taches',
  difficulty  integer not null default 1 check (difficulty between 1 and 3)
);

-- Jeu de données initial
insert into tasks (text, mode, difficulty) values
  ('Faire rire quelqu''un sans parler', 'taches', 1),
  ('Dire un mot en espagnol', 'taches', 1),
  ('Imiter un animal', 'taches', 1),
  ('Chanter une note pendant 5 secondes', 'taches', 1),
  ('Faire semblant de téléphoner', 'taches', 2),
  ('Placer le mot "délicieux" dans une phrase', 'taches', 2),
  ('Faire un compliment à quelqu''un', 'taches', 1),
  ('Lever les deux mains sans raison', 'taches', 2),
  ('Boire quelque chose sans être vu', 'taches', 2),
  ('Demander l''heure à quelqu''un', 'taches', 1),
  ('Parler avec un accent pendant 10 secondes', 'taches', 3),
  ('Pointer quelque chose au plafond', 'taches', 2),
  ('Claquer des doigts trois fois', 'taches', 1),
  ('Se lever et se rasseoir discrètement', 'taches', 2),
  ('Mentionner la nourriture dans la conversation', 'taches', 1),
  ('Faire une blague culinaire', 'taches', 2),
  ('Toucher ta tête subtilement', 'taches', 1),
  ('Dire "exactement" deux fois de suite', 'taches', 2),
  ('Bâiller de façon exagérée', 'taches', 1),
  ('Féliciter quelqu''un pour quelque chose', 'taches', 1)
on conflict do nothing;

-- ────────────────────────────────────────────────────────────
-- 4. ROUNDS — manches
-- ────────────────────────────────────────────────────────────
create table if not exists rounds (
  id                    uuid primary key default gen_random_uuid(),
  game_id               uuid not null references games(id) on delete cascade,
  round_number          integer not null,
  status                text not null default 'playing', -- playing | countdown | finished
  winner_id             uuid references players(id),
  countdown_started_at  timestamptz,   -- début des "Derniers frémissements"
  started_at            timestamptz default now(),
  ended_at              timestamptz,
  unique (game_id, round_number)
);

-- ────────────────────────────────────────────────────────────
-- 5. PLAYER_TASKS — tâches assignées à chaque joueur par manche
-- ────────────────────────────────────────────────────────────
create table if not exists player_tasks (
  id          uuid primary key default gen_random_uuid(),
  round_id    uuid not null references rounds(id) on delete cascade,
  player_id   uuid not null references players(id) on delete cascade,
  task_id     uuid not null references tasks(id),
  status      text not null default 'pending', -- pending | done | missed | grilled
  order_index integer not null,                -- ordre d'affichage dans la liste
  done_at     timestamptz,
  grilled_by  uuid references players(id)      -- qui a grillé ce joueur
);

create index if not exists player_tasks_round_player_idx on player_tasks(round_id, player_id);

-- ────────────────────────────────────────────────────────────
-- 6. ACCUSATIONS — événements TAUK!
-- ────────────────────────────────────────────────────────────
create table if not exists accusations (
  id              uuid primary key default gen_random_uuid(),
  round_id        uuid not null references rounds(id) on delete cascade,
  accuser_id      uuid not null references players(id),
  accused_id      uuid not null references players(id),
  player_task_id  uuid references player_tasks(id), -- tâche sélectionnée par l'accusé
  result          text,                              -- confirmed | denied | pending
  created_at      timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- 7. FONCTION — génère un code de partie unique (4 lettres)
-- ────────────────────────────────────────────────────────────
create or replace function generate_game_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ'; -- sans I et O (confusion)
  code  text;
begin
  loop
    code := '';
    for i in 1..4 loop
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from games where games.code = code and status != 'finished');
  end loop;
  return code;
end;
$$;

-- ────────────────────────────────────────────────────────────
-- 8. FONCTION — assigne N tâches aléatoires à tous les joueurs d'un round
-- ────────────────────────────────────────────────────────────
create or replace function assign_tasks_for_round(p_round_id uuid, p_task_count integer)
returns void
language plpgsql
as $$
declare
  p_record  record;
  t_record  record;
  idx       integer;
  v_game_id uuid;
  v_mode    text;
begin
  select r.game_id, g.mode into v_game_id, v_mode
  from rounds r
  join games g on g.id = r.game_id
  where r.id = p_round_id;

  for p_record in
    select id from players where game_id = v_game_id
  loop
    idx := 0;
    for t_record in
      select id from tasks where mode = v_mode
      order by random()
      limit p_task_count
    loop
      insert into player_tasks (round_id, player_id, task_id, order_index)
      values (p_round_id, p_record.id, t_record.id, idx);
      idx := idx + 1;
    end loop;
  end loop;
end;
$$;

-- ────────────────────────────────────────────────────────────
-- 9. RLS — policies de sécurité
--    (permissives pour le MVP — à durcir avant prod publique)
-- ────────────────────────────────────────────────────────────
alter table games        enable row level security;
alter table players      enable row level security;
alter table rounds       enable row level security;
alter table player_tasks enable row level security;
alter table accusations  enable row level security;
alter table tasks        enable row level security;

-- Lecture publique (anon key suffit)
create policy "games_read"        on games        for select using (true);
create policy "players_read"      on players      for select using (true);
create policy "rounds_read"       on rounds       for select using (true);
create policy "accusations_read"  on accusations  for select using (true);
create policy "tasks_read"        on tasks        for select using (true);

-- player_tasks : chaque joueur ne voit QUE ses propres tâches
-- (les autres voient count mais pas le contenu)
create policy "player_tasks_own"  on player_tasks for select
  using (true);  -- pour le MVP ; à restreindre avec auth.uid() en v2

-- Écriture publique (MVP sans auth — à sécuriser avec auth Supabase en v2)
create policy "games_insert"        on games        for insert with check (true);
create policy "games_update"        on games        for update using (true);
create policy "players_insert"      on players      for insert with check (true);
create policy "players_update"      on players      for update using (true);
create policy "rounds_insert"       on rounds       for insert with check (true);
create policy "rounds_update"       on rounds       for update using (true);
create policy "player_tasks_insert" on player_tasks for insert with check (true);
create policy "player_tasks_update" on player_tasks for update using (true);
create policy "accusations_insert"  on accusations  for insert with check (true);
create policy "accusations_update"  on accusations  for update using (true);

-- ────────────────────────────────────────────────────────────
-- 10. REALTIME — à activer après création des tables
-- ────────────────────────────────────────────────────────────
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table rounds;
alter publication supabase_realtime add table player_tasks;
alter publication supabase_realtime add table accusations;

-- REPLICA IDENTITY FULL : nécessaire pour que les filtres Realtime
-- sur les UPDATE fonctionnent (par défaut seule la PK est dans le WAL)
alter table players      replica identity full;
alter table games        replica identity full;
alter table rounds       replica identity full;
 