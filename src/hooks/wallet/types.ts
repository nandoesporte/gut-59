
import { TransactionType } from '@/types/wallet';

export type TransactionInput = {
  amount: number;
  type: TransactionType;
  description?: string;
  recipientId?: string;
  qrCodeId?: string;
};

export type QRCodeInput = {
  amount: number;
};
