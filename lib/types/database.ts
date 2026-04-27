// ============================================================
// Supabase Database Types
// Auto-generate these with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID
// This file provides the manual type scaffold until generation is run.
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      practice_sessions: {
        Row: {
          id: string;
          user_id: string;
          session_date: string;
          day_type: 'tuesday' | 'wednesday' | 'thursday';
          started_at: string | null;
          completed_at: string | null;
          overall_quality: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['practice_sessions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['practice_sessions']['Insert']>;
      };
      session_blocks: {
        Row: {
          id: string;
          session_id: string;
          block_key: string;
          completed: boolean;
          quality: number | null;
          metric_result: string | null;
          notes: string | null;
          sequence_felt_right: boolean | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['session_blocks']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['session_blocks']['Insert']>;
      };
      rounds: {
        Row: {
          id: string;
          user_id: string;
          played_date: string;
          course_name: string;
          gross_score: number;
          course_rating: number | null;
          slope: number | null;
          handicap_differential: number | null;
          sg_off_tee: number | null;
          sg_approach: number | null;
          sg_around_green: number | null;
          sg_putting: number | null;
          key_moment: string | null;
          mental_state: number | null;
          conditions: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['rounds']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['rounds']['Insert']>;
      };
      ai_insights: {
        Row: {
          id: string;
          user_id: string;
          generated_at: string;
          insight_type: 'weekly_summary' | 'pre_session' | 'round_debrief';
          content: string;
          context_json: Json | null;
        };
        Insert: Omit<Database['public']['Tables']['ai_insights']['Row'], 'id' | 'generated_at'>;
        Update: Partial<Database['public']['Tables']['ai_insights']['Insert']>;
      };
      handicap_history: {
        Row: {
          id: string;
          user_id: string;
          recorded_date: string;
          handicap_index: number;
        };
        Insert: Omit<Database['public']['Tables']['handicap_history']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['handicap_history']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Convenience row types
export type PracticeSession = Database['public']['Tables']['practice_sessions']['Row'];
export type SessionBlock = Database['public']['Tables']['session_blocks']['Row'];
export type Round = Database['public']['Tables']['rounds']['Row'];
export type AiInsight = Database['public']['Tables']['ai_insights']['Row'];
export type HandicapEntry = Database['public']['Tables']['handicap_history']['Row'];
