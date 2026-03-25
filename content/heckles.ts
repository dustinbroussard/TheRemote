export const MAX_HECKLES = 3;

export interface HeckleGenerationContext {
  isSolo?: boolean;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  prompt?: string;
  playerName?: string;
  opponentName?: string;
  [key: string]: unknown;
}
