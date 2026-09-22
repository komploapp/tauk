import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Character =
  | 'choux' | 'avocado' | 'onion' | 'carot' | 'banana'
  | 'potatoes' | 'poivron' | 'aubergine' | 'mushroom';

export type GameMode = 'taches';

export type GameStatus = 'lobby' | 'playing' | 'finished';
export type RoundStatus = 'playing' | 'countdown' | 'finished';
export type TaskStatus = 'pending' | 'done' | 'missed' | 'grilled';
export type AccusationResult = 'confirmed' | 'denied' | 'pending';

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
}

export interface Round {
  id: string;
  game_id: string;
  round_number: number;
  status: RoundStatus;
  winner_id?: string;
  countdown_started_at?: string;
}

export interface Accusation {
  id: string;
  round_id: string;
  accuser_id: string;
  accused_id: string;
  player_task_id?: string;
  result: AccusationResult;
}

// ─── State ────────────────────────────────────────────────────────────────────

interface AppState {
  // Identité de ce device
  deviceId: string | null;
  myPlayer: Player | null;

  // Partie en cours
  game: Game | null;
  players: Player[];
  currentRound: Round | null;
  myTasks: PlayerTask[];          // tâches secrètes de ce joueur
  activeAccusation: Accusation | null;

  // Actions
  setDeviceId: (id: string) => void;
  setMyPlayer: (player: Player) => void;
  setGame: (game: Game) => void;
  setPlayers: (players: Player[]) => void;
  upsertPlayer: (player: Player) => void;
  setCurrentRound: (round: Round) => void;
  setMyTasks: (tasks: PlayerTask[]) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  setActiveAccusation: (accusation: Accusation | null) => void;
  reset: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

const INITIAL: Omit<AppState, keyof ReturnType<typeof actions>> = {
  deviceId: null,
  myPlayer: null,
  game: null,
  players: [],
  currentRound: null,
  myTasks: [],
  activeAccusation: null,
};

function actions(set: (fn: (s: AppState) => Partial<AppState>) => void) {
  return {
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
        myTasks: s.myTasks.map((t) =>
          t.id === taskId ? { ...t, status } : t
        ),
      })),
    setActiveAccusation: (accusation: Accusation | null) =>
      set(() => ({ activeAccusation: accusation })),
    reset: () =>
      set(() => ({
        myPlayer: null,
        game: null,
        players: [],
        currentRound: null,
        myTasks: [],
        activeAccusation: null,
      })),
  };
}

export const useStore = create<AppState>((set) => ({
  ...INITIAL,
  ...actions(set as Parameters<typeof actions>[0]),
}));
