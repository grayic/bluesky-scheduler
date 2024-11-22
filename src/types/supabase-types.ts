export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      bluesky_credentials: {
        Row: {
          id: string
          user_id: string
          handle: string
          password: string
          first_name: string
          last_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          handle?: string
          password?: string
          first_name?: string
          last_name?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          handle?: string
          password?: string
          first_name?: string
          last_name?: string
          created_at?: string
          updated_at?: string
        }
      }
      scheduled_posts: {
        Row: {
          id: string
          user_id: string
          text: string
          scheduled_for: string
          status: 'scheduled' | 'published' | 'failed'
          error: string | null
          media: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          text: string
          scheduled_for: string
          status?: 'scheduled' | 'published' | 'failed'
          error?: string | null
          media?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          text?: string
          scheduled_for?: string
          status?: 'scheduled' | 'published' | 'failed'
          error?: string | null
          media?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}