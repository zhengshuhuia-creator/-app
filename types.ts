export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  audioUrl?: string; // URL for the audio blob (for playback)
  timestamp: number;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export interface UserProfile {
  name: string;
  avatarId: string; // Seed for the avatar generator
  isLoggedIn: boolean;
}

export interface Persona {
  name: string;
  description: string;
  avatar: string;
}