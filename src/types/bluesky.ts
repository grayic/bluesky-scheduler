export interface AuthState {
  handle: string;
  password: string;
  isAuthenticated: boolean;
}

export interface MediaFile {
  mimeType: string;
  type: 'image' | 'video';
  base64: string;
}

export interface Post {
  id: string;
  text: string;
  scheduledFor: string;
  status: 'scheduled' | 'published' | 'failed';
  error?: string;
  media?: MediaFile[];
  bluesky_handle?: string; // Add this field
}