
import { TransactionType } from '@/types/wallet';

export type TransactionInput = {
  amount: number;
  type: TransactionType;
  description?: string;
  recipientId?: string;
  recipientEmail?: string;
  qrCodeId?: string;
};

export type EmailTransferInput = {
  amount: number;
  email: string;
  description?: string;
};

export type QRCodeInput = {
  amount: number;
};

export type ProfileResponse = {
  data: { id: string }[] | null;
  error: any;
};
