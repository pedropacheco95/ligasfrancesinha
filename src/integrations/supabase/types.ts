export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      editions: {
        Row: {
          final_game: string | null
          goal_value: number | null
          has_ended: boolean
          id: number
          last_team: string | null
          league_id: number | null
          name: string
          number_of_teams_made: number | null
          time: string | null
        }
        Insert: {
          final_game?: string | null
          goal_value?: number | null
          has_ended?: boolean
          id: number
          last_team?: string | null
          league_id?: number | null
          name: string
          number_of_teams_made?: number | null
          time?: string | null
        }
        Update: {
          final_game?: string | null
          goal_value?: number | null
          has_ended?: boolean
          id?: number
          last_team?: string | null
          league_id?: number | null
          name?: string
          number_of_teams_made?: number | null
          time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "editions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          date: string | null
          edition_id: number | null
          goals_team1: number | null
          goals_team2: number | null
          id: number
          matchweek: number
          played: boolean
          winner: number | null
        }
        Insert: {
          date?: string | null
          edition_id?: number | null
          goals_team1?: number | null
          goals_team2?: number | null
          id: number
          matchweek?: number
          played?: boolean
          winner?: number | null
        }
        Update: {
          date?: string | null
          edition_id?: number | null
          goals_team1?: number | null
          goals_team2?: number | null
          id?: number
          matchweek?: number
          played?: boolean
          winner?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "games_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          id: number
          name: string
          picture: string | null
        }
        Insert: {
          id: number
          name: string
          picture?: string | null
        }
        Update: {
          id?: number
          name?: string
          picture?: string | null
        }
        Relationships: []
      }
      players: {
        Row: {
          birthday: string | null
          full_name: string | null
          id: number
          image_url: string | null
          name: string
        }
        Insert: {
          birthday?: string | null
          full_name?: string | null
          id: number
          image_url?: string | null
          name: string
        }
        Update: {
          birthday?: string | null
          full_name?: string | null
          id?: number
          image_url?: string | null
          name?: string
        }
        Relationships: []
      }
      players_in_edition: {
        Row: {
          appearances: number | null
          draws: number | null
          edition_id: number | null
          goals: number | null
          goals_scored_by_team: number | null
          goals_suffered_by_team: number | null
          id: number
          last_place: number | null
          losts: number | null
          matchweek: number | null
          percentage_of_appearances: number | null
          place: number | null
          player_id: number | null
          points: number | null
          wins: number | null
        }
        Insert: {
          appearances?: number | null
          draws?: number | null
          edition_id?: number | null
          goals?: number | null
          goals_scored_by_team?: number | null
          goals_suffered_by_team?: number | null
          id: number
          last_place?: number | null
          losts?: number | null
          matchweek?: number | null
          percentage_of_appearances?: number | null
          place?: number | null
          player_id?: number | null
          points?: number | null
          wins?: number | null
        }
        Update: {
          appearances?: number | null
          draws?: number | null
          edition_id?: number | null
          goals?: number | null
          goals_scored_by_team?: number | null
          goals_suffered_by_team?: number | null
          id?: number
          last_place?: number | null
          losts?: number | null
          matchweek?: number | null
          percentage_of_appearances?: number | null
          place?: number | null
          player_id?: number | null
          points?: number | null
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "players_in_edition_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_in_edition_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players_in_game: {
        Row: {
          game_id: number | null
          goals: number | null
          id: number
          player_id: number | null
          team: string
        }
        Insert: {
          game_id?: number | null
          goals?: number | null
          id: number
          player_id?: number | null
          team: string
        }
        Update: {
          game_id?: number | null
          goals?: number | null
          id?: number
          player_id?: number | null
          team?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_in_game_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_in_game_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
