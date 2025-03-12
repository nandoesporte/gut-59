
export interface AssessmentQuestion {
  id: number;
  text: string;
  type: 'burnout' | 'anxiety' | 'stress' | 'depression';
  reversed?: boolean;
}

export interface AssessmentResponse {
  id?: string;
  user_id?: string;
  assessment_type: 'burnout' | 'anxiety' | 'stress' | 'depression';
  responses: Record<number, number>; // Question ID -> Answer value
  score: number;
  created_at?: string;
}

export interface AssessmentResult {
  score: number;
  interpretation: string;
  level: 'low' | 'moderate' | 'high' | 'severe';
  recommendations: string[];
}

export interface AssessmentType {
  id: 'burnout' | 'anxiety' | 'stress' | 'depression';
  title: string;
  description: string;
  instructions: string;
  questions: AssessmentQuestion[];
  scoreRanges: {
    low: [number, number];
    moderate: [number, number];
    high: [number, number];
    severe: [number, number];
  };
  getResult: (score: number) => AssessmentResult;
}
