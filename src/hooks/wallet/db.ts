
import { supabase } from '@/integrations/supabase/client';

// Definindo tipos básicos sem complexidade
type TransactionType = 
  | 'daily_tip'
  | 'water_intake'
  | 'steps'
  | 'meal_plan'
  | 'workout_plan'
  | 'physio_plan'
  | 'transfer';

// Interface simples para inserção de transação
type TransactionCreate = {
  wallet_id: string;
  amount: number;
  transaction_type: TransactionType;
  description?: string;
  recipient_id?: string;
  qr_code_id?: string;
};

/**
 * Busca o ID do usuário pelo email
 */
export async function findRecipientByEmail(email: string): Promise<string> {
  const response = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .limit(1)
    .single();
  
  if (response.error) {
    throw new Error('Erro ao buscar usuário: ' + response.error.message);
  }
  
  if (!response.data) {
    throw new Error('Usuário não encontrado');
  }

  return response.data.id;
}

/**
 * Cria uma transação na carteira
 */
export async function createWalletTransaction(input: {
  walletId: string;
  amount: number;
  type: TransactionType;
  description?: string;
  recipientId?: string;
  qrCodeId?: string;
}): Promise<void> {
  // Transação do remetente
  const senderTransaction: TransactionCreate = {
    wallet_id: input.walletId,
    amount: -input.amount,
    transaction_type: input.type,
    description: input.description,
    recipient_id: input.recipientId,
    qr_code_id: input.qrCodeId
  };

  // Insere a transação do remetente
  const { error: senderError } = await supabase
    .from('fit_transactions')
    .insert(senderTransaction);

  if (senderError) {
    throw new Error('Erro ao criar transação do remetente: ' + senderError.message);
  }

  // Se houver destinatário, cria a transação correspondente
  if (input.recipientId) {
    // Busca a carteira do destinatário
    const recipientWallet = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', input.recipientId)
      .single();

    if (recipientWallet.error || !recipientWallet.data) {
      throw new Error('Carteira do destinatário não encontrada');
    }

    // Transação do destinatário
    const recipientTransaction: TransactionCreate = {
      wallet_id: recipientWallet.data.id,
      amount: input.amount,
      transaction_type: input.type,
      description: input.description || 'Transferência recebida',
      recipient_id: input.recipientId,
      qr_code_id: input.qrCodeId
    };

    // Insere a transação do destinatário
    const { error: recipientError } = await supabase
      .from('fit_transactions')
      .insert(recipientTransaction);

    if (recipientError) {
      throw new Error('Erro ao criar transação do destinatário: ' + recipientError.message);
    }
  }
}
