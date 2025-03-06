
import { z } from "zod";

export type AgentType = 'meal_plan' | 'workout' | 'physiotherapy' | 'mental_health';

export interface AIAgentPrompt {
  id: string;
  agent_type: AgentType;
  name: string;
  description: string | null;
  prompt: string;
  is_active: boolean | null;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
}

export const agentPromptSchema = z.object({
  agent_type: z.enum(['meal_plan', 'workout', 'physiotherapy', 'mental_health']),
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  description: z.string().nullable(),
  prompt: z.string().min(10, 'Prompt deve ter pelo menos 10 caracteres'),
  is_active: z.boolean().nullable(),
});
