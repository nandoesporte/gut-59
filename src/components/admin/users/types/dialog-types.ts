
import { User } from "../../types";

export interface PaymentRequirement {
  planType: 'nutrition' | 'workout' | 'rehabilitation';
  isRequired: boolean;
  isDisabling: boolean;
}

export interface UserDetailsDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onSendMessage?: () => Promise<void>;
  newMessage?: string;
  onMessageChange?: (value: string) => void;
  loading?: boolean;
}

export const planLabels: Record<PaymentRequirement['planType'], string> = {
  nutrition: 'Plano Nutricional',
  workout: 'Plano de Treino',
  rehabilitation: 'Plano de Fisioterapia'
};
