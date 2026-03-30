export const MAX_HECKLES = 3;

export interface HeckleGenerationContext {
  isSolo: boolean;
  playerName?: string;
  opponentName?: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  lastCorrect?: boolean;
}
