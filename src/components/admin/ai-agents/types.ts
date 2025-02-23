
export type AgentType = 'meal_plan' | 'workout' | 'physiotherapy';

export interface AIAgentPrompt {
  id: string;
  agent_type: AgentType;
  name: string;
  description: string | null;
  prompt: string;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  is_active: boolean | null;
}
