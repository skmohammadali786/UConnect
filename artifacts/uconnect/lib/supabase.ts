import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          username: string;
          display_name: string;
          college: string;
          branch: string;
          year: string;
          bio: string;
          avatar: string | null;
          interests: string[];
          followers: number;
          following: number;
          posts_count: number;
          is_verified: boolean;
          joined_at: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      posts: {
        Row: {
          id: string;
          author_id: string;
          author_username: string;
          author_avatar: string | null;
          college: string;
          is_anonymous: boolean;
          tag: string;
          content: string;
          media_urls: string[];
          video_url: string | null;
          upvotes: number;
          downvotes: number;
          comment_count: number;
          auto_delete_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["posts"]["Row"], "created_at" | "upvotes" | "downvotes" | "comment_count">;
        Update: Partial<Database["public"]["Tables"]["posts"]["Row"]>;
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          parent_id: string | null;
          author_id: string;
          author_username: string;
          author_avatar: string | null;
          is_anonymous: boolean;
          content: string;
          upvotes: number;
          downvotes: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["comments"]["Row"], "created_at" | "upvotes" | "downvotes">;
        Update: Partial<Database["public"]["Tables"]["comments"]["Row"]>;
      };
      post_votes: {
        Row: { id: string; user_id: string; post_id: string; vote: "up" | "down"; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["post_votes"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["post_votes"]["Row"]>;
      };
      comment_votes: {
        Row: { id: string; user_id: string; comment_id: string; vote: "up" | "down"; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["comment_votes"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["comment_votes"]["Row"]>;
      };
      bookmarks: {
        Row: { id: string; user_id: string; post_id: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["bookmarks"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["bookmarks"]["Row"]>;
      };
      drafts: {
        Row: { id: string; user_id: string; content: string; tag: string; is_anonymous: boolean; saved_at: string };
        Insert: Omit<Database["public"]["Tables"]["drafts"]["Row"], "saved_at">;
        Update: Partial<Database["public"]["Tables"]["drafts"]["Row"]>;
      };
      confessions: {
        Row: { id: string; college: string; content: string; upvotes: number; comment_count: number; has_sensitive_content: boolean; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["confessions"]["Row"], "upvotes" | "comment_count" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["confessions"]["Row"]>;
      };
      confession_comments: {
        Row: { id: string; confession_id: string; author_id: string; is_anonymous: boolean; content: string; upvotes: number; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["confession_comments"]["Row"], "upvotes" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["confession_comments"]["Row"]>;
      };
      confession_votes: {
        Row: { id: string; user_id: string; confession_id: string; vote: "up" | "down"; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["confession_votes"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["confession_votes"]["Row"]>;
      };
      following: {
        Row: { id: string; follower_id: string; following_id: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["following"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["following"]["Row"]>;
      };
      reports: {
        Row: { id: string; reporter_id: string; post_id: string; reason: string; status: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["reports"]["Row"], "id" | "status" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["reports"]["Row"]>;
      };
      conversations: {
        Row: { id: string; user_a: string; user_b: string; is_anonymous: boolean; is_revealed: boolean; is_blocked: boolean; last_message: string; last_message_at: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["conversations"]["Row"], "created_at" | "last_message" | "last_message_at">;
        Update: Partial<Database["public"]["Tables"]["conversations"]["Row"]>;
      };
      messages: {
        Row: { id: string; conversation_id: string; sender_id: string; content: string; is_read: boolean; is_revealed: boolean; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["messages"]["Row"], "id" | "is_read" | "is_revealed" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["messages"]["Row"]>;
      };
      notifications: {
        Row: { id: string; user_id: string; type: string; title: string; body: string; is_read: boolean; action_id: string | null; action_type: string | null; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["notifications"]["Row"], "id" | "is_read" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
      };
      teams: {
        Row: { id: string; title: string; type: string; description: string; skills: string[]; members: number; max_members: number; deadline: string; poster_id: string; poster_username: string; college: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["teams"]["Row"], "created_at" | "members">;
        Update: Partial<Database["public"]["Tables"]["teams"]["Row"]>;
      };
      team_requests: {
        Row: { id: string; team_id: string; user_id: string; username: string; display_name: string; college: string; message: string; status: string; requested_at: string };
        Insert: Omit<Database["public"]["Tables"]["team_requests"]["Row"], "id" | "status" | "requested_at">;
        Update: Partial<Database["public"]["Tables"]["team_requests"]["Row"]>;
      };
      events: {
        Row: { id: string; title: string; description: string; date: string; location: string; college: string; organizer: string; organizer_id: string; image_url: string | null; rsvp_count: number; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["events"]["Row"], "id" | "rsvp_count" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["events"]["Row"]>;
      };
      event_rsvps: {
        Row: { id: string; user_id: string; event_id: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["event_rsvps"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["event_rsvps"]["Row"]>;
      };
      internships: {
        Row: { id: string; company: string; role: string; location: string; duration: string; stipend: string; type: string; skills: string[]; deadline: string; poster_id: string; poster_username: string; is_verified: boolean; description: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["internships"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["internships"]["Row"]>;
      };
      internship_applications: {
        Row: { id: string; user_id: string; internship_id: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["internship_applications"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["internship_applications"]["Row"]>;
      };
      notes: {
        Row: { id: string; title: string; subject: string; college: string; year: string; uploader_id: string; uploader_username: string; file_url: string; file_type: string; description: string; downloads: number; saves: number; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["notes"]["Row"], "id" | "downloads" | "saves" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["notes"]["Row"]>;
      };
      note_saves: {
        Row: { id: string; user_id: string; note_id: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["note_saves"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["note_saves"]["Row"]>;
      };
      user_settings: {
        Row: { id: string; user_id: string; push_notifications: boolean; default_anonymous: boolean; show_sensitive_content: boolean; compact_mode: boolean; updated_at: string };
        Insert: Omit<Database["public"]["Tables"]["user_settings"]["Row"], "id" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["user_settings"]["Row"]>;
      };
    };
  };
};
