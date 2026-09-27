import { create } from 'zustand';
import type { Lang } from '@/lib/i18n';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Character =
  | 'choux' | 'avocado' | 'onion' | 'carot' | 'banana'
  | 'potatoes' | 'poivron' | 'aubergine' | 'mushroom';

export type GameMode = 'taches';

export type GameStatus = 'lobby' | 'playing' | 'finished';
export type RoundStatus = 'playing' | 'countdown' | 'finished';
export type TaskStatus = 'pending' | 'done' | 'missed' | 'grilled';
export type AccusationResult = 'confirmed' | 'denied' | 'pending' | 'cancelled';

export interface Player {
  id: string;
  game_id: string;
  device_id: string;
  pseudo: string;
  character: Character;
  is_host: boolean;
  is_ready: boolean;
  score: number;
}

export interface PlayerTask {
  id: string;
  round_id: string;
  player_id: string;
  task_id: string;
  task_text: string;
  status: TaskStatus;
  order_index: number;
  grilled_by?: string;
}

export interface Game {
  id: string;
  code: string;
  mode: GameMode;
  status: GameStatus;
  host_id: string;
  task_count: number;
  round_count: number;
  round_duration_s: number | null;
}

export interface Round {
  id: string;
  game_id: string;
  round_number: number;
  status: RoundStatus;
  winner_id?: string;
  started_at?: string;
  countdown_started_at?: string;
  total_paused_ms?: number;
  paused_since?: string | null;
}

export interface Accusation {
  id: string;
  round_id: string;
  accuser_id: string;
  accused_id: string;
  player_task_id?: string;
  result: AccusationResult;
}

// Entrée pour chaque tâche en cours de validation (fenêtre de 10 s)
export interface ValidatingEntry {
  id: string;
  startedAt: number;       // Date.now() quand la tâche est entrée en validation
  frozenAt: number | null; // Date.now() quand TAUK a gelé le compteur (null = pas encore gelé)
}

// ─── State ────────────────────────────────────────────────────────────────────

interface AppState {
  // Langue sélectionnée
  lang: Lang;

  // Identité de ce device
  deviceId: string | null;
  myPlayer: Player | null;

  // Partie en cours
  game: Game | null;
  players: Player[];
  currentRound: Round | null;
  myTasks: PlayerTask[];
  activeAccusation: Accusation | null;
  buzzer: Player | null;
  validatingTasks: ValidatingEntry[]; // tâches dans la fenêtre de 10 s, avec timestamps
  taukActive: boolean;                // TAUK pressé — gèle les compteurs
  taukFiredAt: number | null;         // timestamp ms au moment du TAUK (pour geler le timer global)
  leftPlayerIds: string[];            // IDs des joueurs qui ont quitté la session
  leftPlayers: Player[];             // Objets complets des joueurs partis (pour affichage résultats)

  // Préférences
  muted: boolean;
  musicMuted: boolean;

  // Actions
  setLang: (lang: Lang) => void;
  setMuted: (muted: boolean) => void;
  setMusicMuted: (v: boolean) => void;
  setDeviceId: (id: string) => void;
  setMyPlayer: (player: Player) => void;
  setGame: (game: Game) => void;
  setPlayers: (players: Player[]) => void;
  upsertPlayer: (player: Player) => void;
  setCurrentRound: (round: Round) => void;
  setMyTasks: (tasks: PlayerTask[]) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  setActiveAccusation: (accusation: Accusation | null) => void;
  setBuzzer: (player: Player | null) => void;
  addValidatingTask: (id: string) => void;
  removeValidatingTask: (id: string) => void;
  clearValidatingTasks: () => void;
  addLeftPlayerId: (id: string) => void;
  addLeftPlayer: (player: Player) => void;
  // Active le gel : enregistre frozenAt sur toutes les entrées + passe taukActive à true
  activateTauk: () => void;
  // Désactive le gel sans effacer frozenAt (pour la reprise)
  deactivateTauk: () => void;
  reset: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

const INITIAL: Omit<AppState, keyof ReturnType<typeof actions>> = {
  lang: 'fr',
  muted: false,
  musicMuted: false,
  deviceId: null,
  myPlayer: null,
  game: null,
  players: [],
  currentRound: null,
  myTasks: [],
  activeAccusation: null,
  buzzer: null,
  validatingTasks: [],
  taukActive: false,
  taukFiredAt: null,
  leftPlayerIds: [],
  leftPlayers: [],
};

function actions(set: (fn: (s: AppState) => Partial<AppState>) => void) {
  return {
    setLang: (lang: Lang) => set(() => ({ lang })),
    setMuted: (muted: boolean) => set(() => ({ muted })),
    setMusicMuted: (v: boolean) => set(() => ({ musicMuted: v })),
    setDeviceId: (id: string) => set(() => ({ deviceId: id })),
    setMyPlayer: (player: Player) => set(() => ({ myPlayer: player })),
    setGame: (game: Game) => set(() => ({ game })),
    setPlayers: (players: Player[]) => set(() => ({ players })),
    upsertPlayer: (player: Player) =>
      set((s) => ({
        players: s.players.some((p) => p.id === player.id)
          ? s.players.map((p) => (p.id === player.id ? player : p))
          : [...s.players, player],
      })),
    setCurrentRound: (round: Round) => set(() => ({ currentRound: round })),
    setMyTasks: (tasks: PlayerTask[]) => set(() => ({ myTasks: tasks })),
    updateTaskStatus: (taskId: string, status: TaskStatus) =>
      set((s) => ({
        myTasks: s.myTasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
      })),
    setActiveAccusation: (accusation: Accusation | null) =>
      set(() => ({ activeAccusation: accusation })),
    setBuzzer: (player: Player | null) =>
      set(() => ({ buzzer: player })),
    addValidatingTask: (id) =>
      set((s) => ({
        validatingTasks: s.validatingTasks.some((e) => e.id === id)
          ? s.validatingTasks
          : [...s.validatingTasks, { id, startedAt: Date.now(), frozenAt: null }],
      })),
    removeValidatingTask: (id) =>
      set((s) => ({ validatingTasks: s.validatingTasks.filter((e) => e.id !== id) })),
    clearValidatingTasks: () => set(() => ({ validatingTasks: [] })),
    addLeftPlayerId: (id) =>
      set((s) => ({
        leftPlayerIds: s.leftPlayerIds.includes(id) ? s.leftPlayerIds : [...s.leftPlayerIds, id],
      })),
    addLeftPlayer: (player) =>
      set((s) => ({
        leftPlayers: s.leftPlayers.some((p) => p.id === player.id)
          ? s.leftPlayers
          : [...s.leftPlayers, player],
        leftPlayerIds: s.leftPlayerIds.includes(player.id)
          ? s.leftPlayerIds
          : [...s.leftPlayerIds, player.id],
      })),
    activateTauk: () =>
      set((s) => ({
        taukActive: true,
        taukFiredAt: Date.now(),
        validatingTasks: s.validatingTasks.map((e) => ({
          ...e,
          frozenAt: e.frozenAt ?? Date.now(),
        })),
      })),
    deactivateTauk: () => set(() => ({ taukActive: false, taukFiredAt: null })),
    reset: () =>
      set(() => ({
        myPlayer: null,
        game: null,
        players: [],
        currentRound: null,
        myTasks: [],
        activeAccusation: null,
        validatingTasks: [],
        taukActive: false,
        taukFiredAt: null,
        leftPlayerIds: [],
        leftPlayers: [],
      })),
  };
}

export const useStore = create<AppState>((set) => ({
  ...INITIAL,
  ...actions(set as Parameters<typeof actions>[0]),
}));
