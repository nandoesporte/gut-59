
export type TransactionType = 
  | 'daily_tip'
  | 'water_intake'
  | 'steps'
  | 'meal_plan'
  | 'workout_plan'
  | 'physio_plan'
  | 'transfer'
  | 'steps_reward'
  | 'water_reward'
  | 'meal_plan_generation'
  | 'workout_plan_generation'
  | 'rehab_plan_generation'
  | 'breathing_exercise';

export interface Transaction {
  id: string;
  amount: number;
  transaction_type: TransactionType;
  description: string | null;
  created_at: string;
  recipient_id?: string;
  qr_code_id?: string;
}

export interface Wallet {
  id: string;
  balance: number;
  user_id: string;
}

export interface TransferQRCode {
  id: string;
  amount: number;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  creator_id: string;
  used_by: string | null;
}
