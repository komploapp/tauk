import { supabase } from './supabase';
import type { Game, Player, Round, PlayerTask, Character, Accusation } from '@/store';

// ─── Génération device ID ──────────────────────────────────────────────────────

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = 'tauk_device_id';

export async function getOrCreateDeviceId(): Promise<string> {
  if (Platform.OS === 'web') {
    // sessionStorage is per-tab so multiple browser tabs each get a unique device ID.
    const stored = typeof window !== 'undefined' ? window.sessionStorage.getItem(DEVICE_ID_KEY) : null;
    if (stored) return stored;
    const id = Crypto.randomUUID();
    if (typeof window !== 'undefined') window.sessionStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  }
  const stored = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (stored) return stored;
  const id = Crypto.randomUUID();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  return id;
}

// ─── Création de partie (host) ─────────────────────────────────────────────────

export async function createGame(
  deviceId: string,
  pseudo: string,
  character: Character,
  taskCount = 7,
  roundCount = 3,
  roundDurationS: number | null = null,
): Promise<{ game: Game; player: Player }> {
  const code = await generateUniqueCode();

  const { data: game, error: gameErr } = await supabase
    .from('games')
    .insert({ code, mode: 'taches', status: 'lobby', task_count: taskCount, round_count: roundCount, round_duration_s: roundDurationS })
    .select()
    .single();

  if (gameErr || !game) throw new Error(gameErr?.message ?? 'Erreur création partie');

  const { data: player, error: playerErr } = await supabase
    .from('players')
    .insert({ game_id: game.id, device_id: deviceId, pseudo, character, is_host: true })
    .select()
    .single();

  if (playerErr || !player) throw new Error(playerErr?.message ?? 'Erreur création joueur');

  await supabase.from('games').update({ host_id: player.id }).eq('id', game.id);

  return { game: { ...game, host_id: player.id }, player };
}

// ─── Rejoindre une partie ──────────────────────────────────────────────────────

export async function joinGame(
  code: string,
  deviceId: string,
  pseudo: string,
): Promise<{ game: Game; player: Player }> {
  const { data: game, error: gameErr } = await supabase
    .from('games')
    .select()
    .eq('code', code.toUpperCase())
    .eq('status', 'lobby')
    .single();

  if (gameErr || !game) throw new Error('Code invalide ou partie déjà lancée');

  // If this device is already in the game (e.g. host rejoining), return existing player.
  const { data: existing } = await supabase
    .from('players')
    .select()
    .eq('game_id', game.id)
    .eq('device_id', deviceId)
    .maybeSingle();

  if (existing) return { game, player: existing as Player };

  const character = await pickAvailableCharacter(game.id);

  const { data: player, error: playerErr } = await supabase
    .from('players')
    .insert({ game_id: game.id, device_id: deviceId, pseudo, character, is_host: false })
    .select()
    .single();

  if (playerErr || !player) throw new Error(playerErr?.message ?? 'Erreur rejoindre partie');

  return { game, player };
}

// ─── Toggle prêt / pas prêt ───────────────────────────────────────────────────

export async function setPlayerReady(playerId: string, ready: boolean): Promise<void> {
  await supabase.from('players').update({ is_ready: ready }).eq('id', playerId);
}

// ─── Modifier le pseudo en lobby ──────────────────────────────────────────────

export async function updatePlayerPseudo(playerId: string, pseudo: string): Promise<void> {
  const { error } = await supabase.from('players').update({ pseudo }).eq('id', playerId);
  if (error) throw new Error(error.message);
}

// ─── Modifier le nombre de manches ───────────────────────────────────────────

export async function updateRoundCount(gameId: string, roundCount: 3 | 6 | 10): Promise<void> {
  const { error } = await supabase.from('games').update({ round_count: roundCount }).eq('id', gameId);
  if (error) throw new Error(error.message);
}

// ─── Modifier la durée du timer ───────────────────────────────────────────────

export async function updateRoundDurationS(gameId: string, durationS: number | null): Promise<void> {
  const { error } = await supabase.from('games').update({ round_duration_s: durationS }).eq('id', gameId);
  if (error) throw new Error(error.message);
}

// ─── Expulser un joueur du lobby ──────────────────────────────────────────────

export async function kickPlayer(playerId: string): Promise<void> {
  const { error } = await supabase.from('players').delete().eq('id', playerId);
  if (error) throw new Error(error.message);
}

// ─── Transférer les privilèges d'hôte ────────────────────────────────────────

export async function transferHost(
  gameId: string,
  newHostId: string,
  oldHostId: string,
): Promise<void> {
  await Promise.all([
    supabase.from('games').update({ host_id: newHostId }).eq('id', gameId),
    supabase.from('players').update({ is_host: true }).eq('id', newHostId),
    supabase.from('players').update({ is_host: false }).eq('id', oldHostId),
  ]);
}

// ─── Lancer la partie (host) ──────────────────────────────────────────────────

export async function startGame(gameId: string): Promise<Round> {
  await supabase.from('games').update({ status: 'playing' }).eq('id', gameId);
  return createRound(gameId, 1);
}

// ─── Créer un nouveau round ───────────────────────────────────────────────────

// Must match COUNTDOWN_START in prepa.tsx so the round timer starts at durationS on the game screen.
const ROUND_PREP_DELAY_S = 10;

export async function createRound(gameId: string, roundNumber: number): Promise<Round> {
  const { data: round, error } = await supabase
    .from('rounds')
    .insert({ game_id: gameId, round_number: roundNumber, status: 'playing', started_at: new Date(Date.now() + ROUND_PREP_DELAY_S * 1000).toISOString() })
    .select()
    .single();

  if (error || !round) throw new Error(error?.message ?? 'Erreur création manche');

  // Assigne les tâches aléatoires via la fonction SQL
  const { error: assignErr } = await supabase.rpc('assign_tasks_for_round', {
    p_round_id: round.id,
    p_task_count: await getTaskCount(gameId),
  });

  if (assignErr) throw new Error(assignErr.message);

  return round;
}

// ─── Charger les tâches du joueur pour un round ───────────────────────────────

export async function loadMyTasks(roundId: string, playerId: string): Promise<PlayerTask[]> {
  const { data, error } = await supabase
    .from('player_tasks')
    .select('*, tasks(text)')
    .eq('round_id', roundId)
    .eq('player_id', playerId)
    .order('order_index');

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    ...row,
    task_text: (row.tasks as { text: string } | null)?.text ?? '',
  }));
}

// ─── Valider une tâche ────────────────────────────────────────────────────────

export async function markTaskDone(
  taskId: string,
  roundId: string,
  playerId: string,
): Promise<void> {
  await supabase
    .from('player_tasks')
    .update({ status: 'done', done_at: new Date().toISOString() })
    .eq('id', taskId);

  // Vérifie si toutes les tâches sont done → lance le countdown
  const { data: remaining } = await supabase
    .from('player_tasks')
    .select('id')
    .eq('round_id', roundId)
    .eq('player_id', playerId)
    .eq('status', 'pending');

  if (!remaining || remaining.length === 0) {
    await supabase
      .from('rounds')
      .update({ status: 'countdown', countdown_started_at: new Date().toISOString() })
      .eq('id', roundId);
  }
}

// ─── Créer une accusation TAUK! ───────────────────────────────────────────────

export async function createAccusation(
  roundId: string,
  accuserId: string,
  accusedId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('accusations')
    .insert({ round_id: roundId, accuser_id: accuserId, accused_id: accusedId, result: 'pending' })
    .select('id')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Erreur TAUK!');

  // Marque la pause côté serveur (timestamp Postgres — aucun biais d'horloge client)
  await supabase.rpc('start_round_pause', { p_round_id: roundId });

  return data.id;
}

// ─── Résoudre une accusation ──────────────────────────────────────────────────

export async function resolveAccusation(
  accusationId: string,
  result: 'confirmed' | 'denied',
  playerTaskId?: string,
): Promise<void> {
  await supabase
    .from('accusations')
    .update({ result, player_task_id: playerTaskId ?? null })
    .eq('id', accusationId);

  const { data: acc } = await supabase
    .from('accusations')
    .select('accuser_id, accused_id')
    .eq('id', accusationId)
    .single();

  if (result === 'confirmed') {
    if (acc?.accuser_id) {
      await supabase.rpc('increment_player_score', { p_player_id: acc.accuser_id, p_delta: 1 });
    }
    if (playerTaskId) {
      await supabase
        .from('player_tasks')
        .update({ status: 'grilled', grilled_by: acc?.accuser_id })
        .eq('id', playerTaskId);
    }
  } else {
    // Accusé à tort → l'accusé gagne +1
    if (acc?.accused_id) {
      await supabase.rpc('increment_player_score', { p_player_id: acc.accused_id, p_delta: 1 });
    }
  }
}

// ─── Annuler une accusation (l'accusateur fait machine arrière) ───────────────

export async function cancelAccusation(accusationId: string): Promise<void> {
  await supabase.from('accusations').update({ result: 'cancelled' }).eq('id', accusationId);
  await supabase.rpc('commit_round_pause_from_accusation', { p_accusation_id: accusationId });
}

// ─── Charger les résultats d'un round (toutes tâches + accusations) ──────────

export async function loadRoundResults(roundId: string): Promise<{
  tasksByPlayer: Record<string, PlayerTask[]>;
  accusations: Accusation[];
}> {
  const [tasksRes, accRes] = await Promise.all([
    supabase.from('player_tasks').select('*, tasks(text)').eq('round_id', roundId),
    supabase.from('accusations').select('*').eq('round_id', roundId),
  ]);

  const tasks: PlayerTask[] = (tasksRes.data ?? []).map((row) => ({
    ...row,
    task_text: (row.tasks as { text: string } | null)?.text ?? '',
  }));

  const tasksByPlayer: Record<string, PlayerTask[]> = {};
  for (const t of tasks) {
    if (!tasksByPlayer[t.player_id]) tasksByPlayer[t.player_id] = [];
    tasksByPlayer[t.player_id].push(t);
  }

  return { tasksByPlayer, accusations: (accRes.data ?? []) as Accusation[] };
}

// ─── Notifier les autres joueurs d'un départ ──────────────────────────────────

export function broadcastPlayerLeft(gameId: string, playerId: string): void {
  supabase.channel(`lobby-${gameId}`).send({
    type: 'broadcast',
    event: 'player_left',
    payload: { playerId },
  }).catch(() => {});
}

// ─── Charger tous les joueurs d'une partie ────────────────────────────────────

export async function loadPlayers(gameId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select()
    .eq('game_id', gameId)
    .order('joined_at');

  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Helpers internes ─────────────────────────────────────────────────────────

const ALL_CHARACTERS: Character[] = [
  'choux', 'avocado', 'onion', 'carot', 'banana',
  'potatoes', 'poivron', 'aubergine', 'mushroom',
];

async function pickAvailableCharacter(gameId: string): Promise<Character> {
  const { data } = await supabase
    .from('players')
    .select('character')
    .eq('game_id', gameId);

  const taken = new Set((data ?? []).map((p) => p.character));
  const available = ALL_CHARACTERS.filter((c) => !taken.has(c));
  if (available.length === 0) return ALL_CHARACTERS[Math.floor(Math.random() * ALL_CHARACTERS.length)];
  return available[Math.floor(Math.random() * available.length)];
}

async function generateUniqueCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    const { data } = await supabase
      .from('games')
      .select('id')
      .eq('code', code)
      .neq('status', 'finished')
      .maybeSingle();
    if (!data) return code;
  }
  return 'TAUK';
}

async function getTaskCount(gameId: string): Promise<number> {
  const { data } = await supabase.from('games').select('task_count').eq('id', gameId).single();
  return data?.task_count ?? 7;
}
