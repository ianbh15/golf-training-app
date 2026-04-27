import { create } from 'zustand';
import { supabase } from '../supabase';
import type { Round } from '../types/database';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

export type RoundDraft = {
  courseName: string;
  playedDate: string;
  grossScore: string;
  courseRating: string;
  slope: string;
  sgOffTee: string;
  sgApproach: string;
  sgAroundGreen: string;
  sgPutting: string;
  keyMoment: string;
  mentalState: number | null;
  conditions: string;
};

type RoundStore = {
  rounds: Round[];
  draft: RoundDraft;
  isSaving: boolean;
  isLoading: boolean;
  error: string | null;

  /** Update individual draft fields */
  updateDraft: (fields: Partial<RoundDraft>) => void;

  /** Reset draft to empty */
  resetDraft: () => void;

  /** Load rounds from Supabase */
  fetchRounds: (userId: string) => Promise<void>;

  /** Save the current draft round to Supabase */
  saveRound: (userId: string) => Promise<string | null>; // returns round ID

  /** Recent course names for autocomplete */
  recentCourses: string[];
};

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

const emptyDraft: RoundDraft = {
  courseName: '',
  playedDate: new Date().toISOString().split('T')[0],
  grossScore: '',
  courseRating: '',
  slope: '',
  sgOffTee: '',
  sgApproach: '',
  sgAroundGreen: '',
  sgPutting: '',
  keyMoment: '',
  mentalState: null,
  conditions: '',
};

/**
 * USGA handicap differential formula:
 * (Gross Score - Course Rating) × (113 / Slope)
 */
function calcDifferential(
  grossScore: number,
  courseRating: number,
  slope: number
): number {
  return parseFloat(((grossScore - courseRating) * (113 / slope)).toFixed(1));
}

// ──────────────────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────────────────

export const useRoundStore = create<RoundStore>((set, get) => ({
  rounds: [],
  draft: { ...emptyDraft },
  isSaving: false,
  isLoading: false,
  error: null,
  recentCourses: [],

  updateDraft: (fields) => {
    set((state) => ({ draft: { ...state.draft, ...fields } }));
  },

  resetDraft: () => {
    set({ draft: { ...emptyDraft, playedDate: new Date().toISOString().split('T')[0] } });
  },

  fetchRounds: async (userId) => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase
      .from('rounds')
      .select('*')
      .eq('user_id', userId)
      .order('played_date', { ascending: false })
      .limit(50);

    if (error) {
      set({ error: error.message, isLoading: false });
      return;
    }

    const rounds = data ?? [];
    // Extract unique recent courses for autocomplete
    const recentCourses = [...new Set(rounds.map((r) => r.course_name))].slice(0, 10);

    set({ rounds, recentCourses, isLoading: false });
  },

  saveRound: async (userId) => {
    const { draft } = get();
    set({ isSaving: true, error: null });

    const grossScore = parseInt(draft.grossScore, 10);
    const courseRating = draft.courseRating ? parseFloat(draft.courseRating) : null;
    const slope = draft.slope ? parseInt(draft.slope, 10) : null;

    if (isNaN(grossScore)) {
      set({ error: 'Gross score is required', isSaving: false });
      return null;
    }

    const handicapDifferential =
      courseRating && slope
        ? calcDifferential(grossScore, courseRating, slope)
        : null;

    const parseOptionalFloat = (v: string) =>
      v.trim() !== '' ? parseFloat(v) : null;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: round, error: insertError } = await supabase
        .from('rounds')
        .insert({
          user_id: userId,
          played_date: draft.playedDate,
          course_name: draft.courseName.trim(),
          gross_score: grossScore,
          course_rating: courseRating,
          slope,
          handicap_differential: handicapDifferential,
          sg_off_tee: parseOptionalFloat(draft.sgOffTee),
          sg_approach: parseOptionalFloat(draft.sgApproach),
          sg_around_green: parseOptionalFloat(draft.sgAroundGreen),
          sg_putting: parseOptionalFloat(draft.sgPutting),
          key_moment: draft.keyMoment.trim() || null,
          mental_state: draft.mentalState,
          conditions: draft.conditions.trim() || null,
        } as any)
        .select('id')
        .single();

      if (insertError) throw insertError;

      const roundId = (round as any).id;

      // Refresh rounds list
      await get().fetchRounds(userId);
      get().resetDraft();

      set({ isSaving: false });
      return roundId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save round';
      set({ error: message, isSaving: false });
      return null;
    }
  },
}));
