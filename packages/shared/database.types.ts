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
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          email: string
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          location: string | null
          latitude: number | null
          longitude: number | null
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          location?: string | null
          latitude?: number | null
          longitude?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          location?: string | null
          latitude?: number | null
          longitude?: number | null
        }
      }
      interests: {
        Row: {
          id: string
          name: string
          category: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          category: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          created_at?: string
        }
      }
      user_interests: {
        Row: {
          id: string
          user_id: string
          interest_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          interest_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          interest_id?: string
          created_at?: string
        }
      }
      events: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          creator_id: string
          title: string
          description: string
          event_type: string
          start_date: string
          end_date: string | null
          location: string
          latitude: number | null
          longitude: number | null
          max_attendees: number | null
          image_url: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          creator_id: string
          title: string
          description: string
          event_type: string
          start_date: string
          end_date?: string | null
          location: string
          latitude?: number | null
          longitude?: number | null
          max_attendees?: number | null
          image_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          creator_id?: string
          title?: string
          description?: string
          event_type?: string
          start_date?: string
          end_date?: string | null
          location?: string
          latitude?: number | null
          longitude?: number | null
          max_attendees?: number | null
          image_url?: string | null
        }
      }
      event_attendees: {
        Row: {
          id: string
          event_id: string
          user_id: string
          status: 'going' | 'interested' | 'maybe'
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          status: 'going' | 'interested' | 'maybe'
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          status?: 'going' | 'interested' | 'maybe'
          created_at?: string
        }
      }
      communities: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          description: string
          creator_id: string
          image_url: string | null
          is_private: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          description: string
          creator_id: string
          image_url?: string | null
          is_private?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          description?: string
          creator_id?: string
          image_url?: string | null
          is_private?: boolean
        }
      }
      community_members: {
        Row: {
          id: string
          community_id: string
          user_id: string
          role: 'admin' | 'moderator' | 'member'
          joined_at: string
        }
        Insert: {
          id?: string
          community_id: string
          user_id: string
          role?: 'admin' | 'moderator' | 'member'
          joined_at?: string
        }
        Update: {
          id?: string
          community_id?: string
          user_id?: string
          role?: 'admin' | 'moderator' | 'member'
          joined_at?: string
        }
      }
      connections: {
        Row: {
          id: string
          user1_id: string
          user2_id: string
          status: 'pending' | 'accepted' | 'declined'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user1_id: string
          user2_id: string
          status?: 'pending' | 'accepted' | 'declined'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user1_id?: string
          user2_id?: string
          status?: 'pending' | 'accepted' | 'declined'
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      nearby_users: {
        Args: {
          lat: number
          long: number
          radius_km: number
        }
        Returns: {
          id: string
          full_name: string
          avatar_url: string
          bio: string
          distance: number
        }[]
      }
      nearby_events: {
        Args: {
          lat: number
          long: number
          radius_km: number
        }
        Returns: {
          id: string
          title: string
          description: string
          start_date: string
          location: string
          distance: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
