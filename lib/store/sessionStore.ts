import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import type { BlockType, DayRoutine } from '../../constants/routine';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

export type BlockDraft = {
  blockKey: string;
  completed: boolean;
  quality: number | null;
  metricResult: string | null;
  notes: string;
  sequenceFeltRight: boolean | null;
  /** Which drills have been ticked off */
  checkedDrills: boolean[];
};

export type SessionDraft = {
  sessionId: string | null; // null = not yet saved to Supabase
  day: 'tuesday' | 'wednesday' | 'thursday';
  sessionDate: string; // ISO date string YYYY-MM-DD
  startedAt: string; // ISO timestamp
  blocks: Record<string, BlockDraft>; // keyed by block_key
  overallQuality: number | null;
  notes: string;
  isComplete: boolean;
};

type SessionStore = {
  draft: SessionDraft | null;
  isSaving: boolean;
  error: string | null;

  /** Initialize a new session for the given routine day */
  startSession: (day: DayRoutine) => void;

  /** Update a single block's data */
  updateBlock: (blockKey: string, data: Partial<BlockDraft>) => void;

  /** Toggle individual drill checkbox */
  toggleDrill: (blockKey: string, drillIndex: number) => void;

  /** Mark a block as complete */
  completeBlock: (blockKey: string) => void;

  /** Set overall session quality */
  setOverallQuality: (quality: number) => void;

  /** Set session notes */
  setNotes: (notes: string) => void;

  /** Save the draft session to Supabase + clear draft */
  saveSession: (userId: string) => Promise<string | null>; // returns session ID

  /** Persist draft to AsyncStorage (offline resilience) */
  persistDraft: () => Promise<void>;

  /** Load draft from AsyncStorage */
  loadDraft: () => Promise<void>;

  /** Clear the draft */
  clearDraft: () => void;
};

const DRAFT_STORAGE_KEY = '@golf_os:session_draft';

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function initBlockDraft(block: BlockType): BlockDraft {
  return {
    blockKey: block.key,
    completed: false,
    quality: null,
    metricResult: null,
    notes: '',
    sequenceFeltRight: null,
    checkedDrills: block.drills.map(() => false),
  };
}

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ──────────────────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────────────────

export const useSessionStore = create<SessionStore>((set, get) => ({
  draft: null,
  isSaving: false,
  error: null,

  startSession: (dayRoutine) => {
    const blocks: Record<string, BlockDraft> = {};
    dayRoutine.blocks.forEach((block) => {
      blocks[block.key] = initBlockDraft(block);
    });

    const draft: SessionDraft = {
      sessionId: null,
      day: dayRoutine.day,
      sessionDate: getTodayISO(),
      startedAt: new Date().toISOString(),
      blocks,
      overallQuality: null,
      notes: '',
      isComplete: false,
    };

    set({ draft, error: null });
    get().persistDraft();
  },

  updateBlock: (blockKey, data) => {
    const { draft } = get();
    if (!draft) return;

    set({
      draft: {
        ...draft,
        blocks: {
          ...draft.blocks,
          [blockKey]: { ...draft.blocks[blockKey], ...data },
        },
      },
    });
    get().persistDraft();
  },

  toggleDrill: (blockKey, drillIndex) => {
    const { draft } = get();
    if (!draft) return;
    const block = draft.blocks[blockKey];
    if (!block) return;

    const checkedDrills = [...block.checkedDrills];
    checkedDrills[drillIndex] = !checkedDrills[drillIndex];

    set({
      draft: {
        ...draft,
        blocks: {
          ...draft.blocks,
          [blockKey]: { ...block, checkedDrills },
        },
      },
    });
    get().persistDraft();
  },

  completeBlock: (blockKey) => {
    get().updateBlock(blockKey, { completed: true });
  },

  setOverallQuality: (quality) => {
    const { draft } = get();
    if (!draft) return;
    set({ draft: { ...draft, overallQuality: quality } });
    get().persistDraft();
  },

  setNotes: (notes) => {
    const { draft } = get();
    if (!draft) return;
    set({ draft: { ...draft, notes } });
    get().persistDraft();
  },

  saveSession: async (userId) => {
    const { draft } = get();
    if (!draft) return null;

    set({ isSaving: true, error: null });

    try {
      // 1. Upsert practice_session
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: session, error: sessionError } = await supabase
        .from('practice_sessions')
        .insert({
          user_id: userId,
          session_date: draft.sessionDate,
          day_type: draft.day,
          started_at: draft.startedAt,
          completed_at: new Date().toISOString(),
          overall_quality: draft.overallQuality,
          notes: draft.notes || null,
        } as any)
        .select('id')
        .single();

      if (sessionError) throw sessionError;
      const sessionId = (session as any).id;

      // 2. Insert session_blocks
      const blockRows = Object.values(draft.blocks).map((b) => ({
        session_id: sessionId,
        block_key: b.blockKey,
        completed: b.completed,
        quality: b.quality,
        metric_result: b.metricResult,
        notes: b.notes || null,
        sequence_felt_right: b.sequenceFeltRight,
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: blocksError } = await supabase
        .from('session_blocks')
        .insert(blockRows as any[]);

      if (blocksError) throw blocksError;

      // 3. Mark draft as complete and store session ID
      set({
        draft: { ...draft, sessionId, isComplete: true },
        isSaving: false,
      });

      // 4. Clear offline draft
      await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);

      return sessionId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save session';
      set({ error: message, isSaving: false });
      return null;
    }
  },

  persistDraft: async () => {
    const { draft } = get();
    if (!draft) return;
    try {
      await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Silent — offline persistence failure is non-fatal
    }
  },

  loadDraft: async () => {
    try {
      const raw = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as SessionDraft;
        // Don't restore already-complete sessions
        if (!draft.isComplete) {
          set({ draft });
        }
      }
    } catch {
      // Corrupt storage — ignore
    }
  },

  clearDraft: () => {
    set({ draft: null, error: null });
    AsyncStorage.removeItem(DRAFT_STORAGE_KEY).catch(() => {});
  },
}));
