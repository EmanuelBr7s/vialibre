// ── Auth Types ──

export type UserRole = 'publicador' | 'solucionador' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  avatar_url?: string;
  phone?: string;
  bio?: string;
  nit_empresa?: string;
  empresa_nombre?: string;
  programa_academico?: string;
  afiliacion_academica?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  role?: UserRole;
  phone?: string;
  nit_empresa?: string;
  empresa_nombre?: string;
  programa_academico?: string;
  afiliacion_academica?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user_id: string;
  role: UserRole;
}

// ── Challenge Types ──

export type ChallengeStatus = 'draft' | 'open' | 'in_progress' | 'resolved' | 'closed';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  publisher_id: string;
  category_id?: string;
  status: ChallengeStatus;
  difficulty?: DifficultyLevel;
  tags?: string[];
  budget?: number;
  deadline?: string;
  is_featured: boolean;
  featured_score: number;
  created_at: string;
  updated_at: string;
}

export interface ChallengeListResponse {
  challenges: Challenge[];
  total: number;
  skip: number;
  limit: number;
}

// ── Match Types ──

export type InteractionStatus = 'pending' | 'accepted' | 'rejected' | 'completed';
export type ReactionType = 'like' | 'bookmark';

export interface Interaction {
  id: string;
  user_id: string;
  challenge_id: string;
  status: InteractionStatus;
  message?: string;
  contact_unlocked: boolean;
  contact_unlocked_at?: string;
  created_at: string;
  updated_at: string;
}

export interface InteractionListResponse {
  interactions: Interaction[];
  total: number;
  skip: number;
  limit: number;
}

export interface Reaction {
  id: string;
  user_id: string;
  challenge_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export interface ReactionListResponse {
  reactions: Reaction[];
  total: number;
  skip: number;
  limit: number;
}

export interface ContactInfo {
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  empresa_nombre?: string;
  programa_academico?: string;
  afiliacion_academica?: string;
}
