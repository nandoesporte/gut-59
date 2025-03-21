
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from '@/hooks/useWallet';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Coins, ArrowUpCircle, CalendarDays, Droplets, Footprints, QrCode, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { TransferForm } from '@/components/wallet/TransferForm';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const transactionTypeInfo = {
  daily_tip: {
    label: 'Dica Diária',
    icon: CalendarDays,
    color: 'text-blue-500'
  },
  water_intake: {
    label: 'Registro de Água',
    icon: Droplets,
    color: 'text-cyan-500'
  },
  steps: {
    label: 'Registro de Passos',
    icon: Footprints,
    color: 'text-green-500'
  },
  meal_plan: {
    label: 'Plano Alimentar',
    icon: ArrowUpCircle,
    color: 'text-emerald-500'
  },
  workout_plan: {
    label: 'Plano de Treino',
    icon: ArrowUpCircle,
    color: 'text-purple-500'
  },
  physio_plan: {
    label: 'Plano de Fisioterapia',
    icon: ArrowUpCircle,
    color: 'text-indigo-500'
  },
  transfer: {
    label: 'Transferência',
    icon: Send,
    color: 'text-orange-500'
  },
  steps_reward: {
    label: 'Recompensa de Passos',
    icon: Footprints,
    color: 'text-green-600'
  },
  water_reward: {
    label: 'Recompensa de Água',
    icon: Droplets,
    color: 'text-blue-600'
  },
  meal_plan_generation: {
    label: 'Geração de Plano Alimentar',
    icon: ArrowUpCircle,
    color: 'text-yellow-500'
  },
  workout_plan_generation: {
    label: 'Geração de Plano de Treino',
    icon: ArrowUpCircle,
    color: 'text-pink-500'
  },
  rehab_plan_generation: {
    label: 'Geração de Plano de Reabilitação',
    icon: ArrowUpCircle,
    color: 'text-red-500'
  },
  breathing_exercise: {
    label: 'Exercício de Respiração',
    icon: CalendarDays,
    color: 'text-blue-400'
  }
};

const Wallet = () => {
  const queryClient = useQueryClient();
  const { wallet, transactions, isLoading, createTransferQRCode, redeemQRCode } = useWallet();
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('wallet-transactions')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'fit_transactions',
            filter: `recipient_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Nova transação recebida:', payload.new);
            const amount = payload.new.amount;
            const audio = new Audio('/notification.mp3');
            
            toast.success(
              'Nova transferência recebida!',
              {
                description: `Você recebeu ${amount} FITs`,
                duration: 5000,
                position: 'top-center',
                icon: <Coins className="h-5 w-5 text-primary animate-bounce" />,
                className: 'bg-card border-border shadow-lg',
                style: {
                  background: '#1A1F2C',
                  color: '#FFFFFF',
                },
              }
            );

            audio.play().catch(() => {});
          }
        )
        .subscribe();

      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Atualização de saldo:', payload.new);
          queryClient.invalidateQueries({ queryKey: ['wallet'] });
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
        }
      );

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtimeSubscription();
  }, [queryClient]);

  const handleCreateQRCode = async () => {
    const amount = parseInt(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Por favor, insira um valor válido');
      return;
    }

    try {
      const qrCode = await createTransferQRCode({ amount });
      if (qrCode) {
        const qrCodeUrl = await QRCode.toDataURL(qrCode.id);
        setQrCodeDataUrl(qrCodeUrl);
      }
    } catch (error) {
      console.error('Error creating QR code:', error);
      toast.error('Erro ao criar QR Code');
    }
  };

  const handleScanQRCode = async (qrCodeId: string) => {
    try {
      await redeemQRCode(qrCodeId);
      setShowScanDialog(false);
    } catch (error) {
      console.error('Error redeeming QR code:', error);
      toast.error('Erro ao resgatar QR Code');
    }
  };

  const filteredTransactions = transactions?.filter(transaction => {
    const searchLower = searchTerm.toLowerCase();
    // Verifique se o tipo de transação existe no objeto transactionTypeInfo
    const typeInfo = transactionTypeInfo[transaction.transaction_type] || {
      label: transaction.transaction_type,
      icon: Coins,
      color: 'text-gray-500'
    };
    
    return (
      transaction.description?.toLowerCase().includes(searchLower) ||
      typeInfo.label.toLowerCase().includes(searchLower) ||
      transaction.amount.toString().includes(searchTerm)
    );
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Card className="bg-gradient-to-br from-primary-500 to-primary-600">
        <CardContent className="pt-6">
          <div className="text-center text-white">
            <Coins className="w-12 h-12 mx-auto mb-2" />
            <h1 className="text-3xl font-bold mb-2">Seu Saldo</h1>
            <p className="text-4xl font-bold">{wallet?.balance || 0} FITs</p>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              <Button 
                variant="secondary" 
                onClick={() => setShowTransferDialog(true)}
              >
                <Send className="w-4 h-4 mr-2" />
                Transferir FITs
              </Button>
              <Button 
                variant="secondary"
                onClick={() => setShowScanDialog(true)}
              >
                <QrCode className="w-4 h-4 mr-2" />
                QR Code
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transações</CardTitle>
          <div className="mt-2">
            <Input
              placeholder="Buscar transações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredTransactions?.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              Nenhuma transação encontrada
            </div>
          ) : (
            filteredTransactions?.map((transaction) => {
              // Adicione uma verificação para garantir que o tipo existe
              const typeInfo = transactionTypeInfo[transaction.transaction_type] || {
                label: transaction.transaction_type,
                icon: Coins,
                color: 'text-gray-500'
              };
              
              const Icon = typeInfo.icon;

              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg mb-2"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full bg-white ${typeInfo.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium">{typeInfo.label}</p>
                      <p className="text-sm text-slate-500">
                        {formatDistanceToNow(new Date(transaction.created_at), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </p>
                    </div>
                  </div>
                  <p className={`font-semibold ${transaction.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount} FITs
                  </p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Transferir FITs</DialogTitle>
            <DialogDescription>
              Envie FITs para outro usuário usando CPF ou telefone
            </DialogDescription>
          </DialogHeader>
          <TransferForm />
        </DialogContent>
      </Dialog>

      <Dialog open={showScanDialog} onOpenChange={setShowScanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ler QR Code</DialogTitle>
            <DialogDescription>
              Digite o código do QR Code para receber os FITs
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Código do QR Code"
              onChange={(e) => handleScanQRCode(e.target.value)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Wallet;
