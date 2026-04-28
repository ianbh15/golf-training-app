import { create } from 'zustand';
import { supabase } from '../supabase';
import type { CustomDrill } from '../types/database';

type DrillStore = {
  drills: CustomDrill[];
  loading: boolean;
  fetchDrills: (userId: string) => Promise<void>;
  addDrill: (
    userId: string,
    drill: Omit<CustomDrill, 'id' | 'user_id' | 'created_at'>
  ) => Promise<boolean>;
  deleteDrill: (id: string) => Promise<void>;
};

export const useDrillStore = create<DrillStore>((set) => ({
  drills: [],
  loading: false,

  fetchDrills: async (userId) => {
    set({ loading: true });
    const { data } = await supabase
      .from('custom_drills')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    set({ drills: data ?? [], loading: false });
  },

  addDrill: async (userId, drill) => {
    const { data, error } = await supabase
      .from('custom_drills')
      .insert({ ...drill, user_id: userId })
      .select()
      .single();
    if (error || !data) return false;
    set((s) => ({ drills: [data, ...s.drills] }));
    return true;
  },

  deleteDrill: async (id) => {
    await supabase.from('custom_drills').delete().eq('id', id);
    set((s) => ({ drills: s.drills.filter((d) => d.id !== id) }));
  },
}));
