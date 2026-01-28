export type GuideCategory = 'getting-started' | 'tutorial' | 'reference' | 'concept' | 'troubleshooting';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export type LearningStatus = 'not-started' | 'in-progress' | 'completed' | 'skipped';

export interface GuideRecord {
  id: string;
  slug: string;
  title: string;
  category: GuideCategory;
  contentPath: string;
  excerpt: string;
  tags: string[];
  relatedTools: string[];
  relatedGuides: string[];
  difficulty: DifficultyLevel;
  estimatedTime: number; // in minutes
  prerequisites: string[];
  createdAt: number;
  updatedAt: number;
  version: string;
}

export interface TutorialStep {
  id: string;
  guideId: string;
  stepNumber: number;
  title: string;
  content: string;
  codeExample?: string;
  expectedOutput?: string;
  checkCommand?: string;
  hints: string[];
  createdAt: number;
  updatedAt: number;
}

export interface LearningProgress {
  id: string;
  guideId: string;
  currentStep: number;
  totalSteps: number;
  status: LearningStatus;
  completedSteps: number[];
  startedAt: number;
  lastAccessedAt: number;
  completedAt?: number;
}

export interface GuideFilter {
  category?: GuideCategory;
  difficulty?: DifficultyLevel;
  tags?: string[];
  limit?: number;
}

export interface GuideFrontmatter {
  title: string;
  category: GuideCategory;
  excerpt: string;
  tags?: string[];
  relatedTools?: string[];
  relatedGuides?: string[];
  difficulty?: DifficultyLevel;
  estimatedTime?: number;
  prerequisites?: string[];
  version?: string;
}
