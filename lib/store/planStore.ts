import { create } from 'zustand';
import { supabase } from '../supabase';
import { ROUTINE, type DayRoutine } from '../../constants/routine';
import type { PracticePlan } from '../types/database';

type PlanStore = {
  activePlan: PracticePlan | null;
  routine: DayRoutine[];
  history: PracticePlan[];
  loading: boolean;
  error: string | null;

  /**
   * Load the user's active plan. Seeds the default ROUTINE on first call
   * if the user has none. Falls back to the in-memory ROUTINE constant
   * if anything fails so the rest of the app keeps working.
   */
  loadActivePlan: (userId: string) => Promise<void>;

  /** Fetch the full plan history (active + archived) for the user. */
  loadHistory: (userId: string) => Promise<void>;

  /**
   * Save a new plan for the user. Marks all existing plans inactive
   * inside a single round-trip, inserts the new active plan, and
   * sets it as the current activePlan.
   */
  saveAiPlan: (userId: string, plan: DayRoutine[], name?: string) => Promise<PracticePlan | null>;
};

function isDayRoutineArray(value: unknown): value is DayRoutine[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (d) =>
      d &&
      typeof d === 'object' &&
      typeof (d as DayRoutine).day === 'string' &&
      Array.isArray((d as DayRoutine).blocks)
  );
}

export const usePlanStore = create<PlanStore>((set, get) => ({
  activePlan: null,
  routine: ROUTINE,
  history: [],
  loading: false,
  error: null,

  loadActivePlan: async (userId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('practice_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const json = data.plan_json;
        const routine = isDayRoutineArray(json) ? json : ROUTINE;
        set({ activePlan: data, routine, loading: false });
        return;
      }

      // Seed the default plan on first login.
      const { data: seeded, error: seedError } = await supabase
        .from('practice_plans')
        .insert({
          user_id: userId,
          is_active: true,
          generated_by: 'default',
          name: 'Default Routine',
          plan_json: ROUTINE as unknown as PracticePlan['plan_json'],
        })
        .select()
        .single();

      if (seedError) throw seedError;

      set({ activePlan: seeded, routine: ROUTINE, loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load plan',
        routine: ROUTINE,
      });
    }
  },

  loadHistory: async (userId) => {
    const { data } = await supabase
      .from('practice_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) set({ history: data });
  },

  saveAiPlan: async (userId, plan, name) => {
    set({ loading: true, error: null });
    try {
      // Archive existing active plans (partial unique index requires this first)
      await supabase
        .from('practice_plans')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);

      const { data, error } = await supabase
        .from('practice_plans')
        .insert({
          user_id: userId,
          is_active: true,
          generated_by: 'ai',
          name: name ?? 'Custom Plan',
          plan_json: plan as unknown as PracticePlan['plan_json'],
        })
        .select()
        .single();

      if (error) throw error;

      set({ activePlan: data, routine: plan, loading: false });
      // Refresh history in the background
      get().loadHistory(userId);
      return data;
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to save plan',
      });
      return null;
    }
  },
}));
