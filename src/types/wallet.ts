
export type TransactionType = 
  | 'daily_tip'
  | 'water_intake'
  | 'steps'
  | 'meal_plan'
  | 'workout_plan'
  | 'physio_plan';

export interface Transaction {
  id: string;
  amount: number;
  transaction_type: TransactionType;
  description: string | null;
  created_at: string;
}

export interface Wallet {
  id: string;
  balance: number;
  user_id: string;
}
