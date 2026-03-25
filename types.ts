export * from './src/types';

export const PLAYABLE_CATEGORIES = [
  'History',
  'Science',
  'Pop Culture',
  'Sports',
  'Art & Music',
  'Technology',
] as const;

export type PlayableCategory = (typeof PLAYABLE_CATEGORIES)[number];
export type Difficulty = 'easy' | 'medium' | 'hard';
export type ThemeMode = 'light' | 'dark';
export type VerificationVerdict = 'pass' | 'reject';
export type VerificationConfidence = 'high' | 'medium' | 'low';
export type QuestionValidationStatus = 'pending' | 'verified' | 'approved' | 'rejected';

export interface TriviaQuestion {
  id: string;
  questionId?: string;
  category: string;
  difficulty: Difficulty;
  question: string;
  choices: string[];
  correctIndex: number;
  answerIndex: number;
  explanation: string;
  correctQuip?: string;
  wrongAnswerQuips?: Record<number, string>;
  validationStatus?: QuestionValidationStatus;
  verificationVerdict?: VerificationVerdict;
  verificationConfidence?: VerificationConfidence;
  verificationIssues?: string[];
  verificationReason?: string;
  pipelineVersion?: string;
  questionStyled?: string;
  explanationStyled?: string;
  hostLeadIn?: string;
  source?: string;
  batchId?: string;
  createdAt?: unknown;
  usedCount?: number;
  used?: boolean;
}

export interface UserSettings {
  themeMode: ThemeMode;
  soundEnabled: boolean;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  commentaryEnabled: boolean;
  updatedAt: number;
}

export interface GameInvite {
  id: string;
  fromUid: string;
  fromDisplayName: string;
  fromPhotoURL?: string;
  toUid: string;
  gameId: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: number;
}

export interface RecentPlayer {
  uid: string;
  displayName: string;
  photoURL?: string;
  lastPlayedAt: number;
  lastGameId?: string;
  hidden?: boolean;
  updatedAt?: number;
}

export interface Player {
  uid: string;
  name: string;
  avatarUrl?: string;
}

export interface CategoryPerformance {
  seen: number;
  correct: number;
  percentageCorrect: number;
}

export interface PlayerStatsSummary {
  completedGames: number;
  wins: number;
  losses: number;
  winPercentage: number;
  totalQuestionsSeen: number;
  totalQuestionsCorrect: number;
  categoryPerformance: Record<string, CategoryPerformance>;
}

export interface PlayerProfile {
  userId: string;
  displayName: string;
  photoURL?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  lastSeenAt?: unknown;
  stats: PlayerStatsSummary;
}

export interface RecentCompletedGame {
  gameId: string;
  players: Array<{ uid: string; displayName: string }>;
  winnerId: string | null;
  finalScores: Record<string, number>;
  categoriesUsed: string[];
  completedAt: number;
  status: 'completed';
  opponentIds: string[];
}

export interface MatchupSummary {
  opponentId: string;
  opponentDisplayName: string;
  opponentPhotoURL?: string;
  wins: number;
  losses: number;
  totalGames: number;
  lastPlayedAt: number;
}

export function getPlayableCategories(): PlayableCategory[] {
  return [...PLAYABLE_CATEGORIES];
}

export function isPlayableCategory(category: string): category is PlayableCategory {
  return (PLAYABLE_CATEGORIES as readonly string[]).includes(category);
}
