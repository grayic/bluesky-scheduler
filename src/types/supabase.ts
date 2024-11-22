import { Database } from './supabase-types';

export type Tables = Database['public']['Tables'];
export type BlueskyCredentials = Tables['bluesky_credentials']['Row'];
export type ScheduledPost = Tables['scheduled_posts']['Row'];