
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from '@/hooks/useWallet';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Coins, ArrowUpCircle, CalendarDays, Droplets, Footprints, QrCode, Send, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import QRCode from 'qrcode';
import { toast } from 'sonner';

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
  }
};

const Wallet = () => {
  const { wallet, transactions, isLoading, createTransferQRCode, redeemQRCode, transferByEmail } = useWallet();
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showEmailTransferDialog, setShowEmailTransferDialog] = useState(false);
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  const handleCreateQRCode = async () => {
    const amount = parseInt(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Por favor, insira um valor válido');
      return;
    }

    try {
      const qrCode = await createTransferQRCode({ amount });
      const qrCodeUrl = await QRCode.toDataURL(qrCode.id);
      setQrCodeDataUrl(qrCodeUrl);
    } catch (error) {
      console.error('Error creating QR code:', error);
      toast.error('Erro ao criar QR Code');
    }
  };

  const handleEmailTransfer = async () => {
    const amount = parseInt(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Por favor, insira um valor válido');
      return;
    }

    try {
      await transferByEmail({ 
        amount, 
        email: recipientEmail,
        description: 'Transferência por email'
      });
      setShowEmailTransferDialog(false);
      setTransferAmount('');
      setRecipientEmail('');
    } catch (error) {
      console.error('Error sending transfer:', error);
    }
  };

  const handleScanQRCode = async (qrCodeId: string) => {
    try {
      await redeemQRCode(qrCodeId);
      setShowScanDialog(false);
    } catch (error) {
      console.error('Error redeeming QR code:', error);
    }
  };

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
                <QrCode className="w-4 h-4 mr-2" />
                Criar QR Code
              </Button>
              <Button 
                variant="secondary"
                onClick={() => setShowScanDialog(true)}
              >
                <QrCode className="w-4 h-4 mr-2" />
                Ler QR Code
              </Button>
              <Button 
                variant="secondary"
                onClick={() => setShowEmailTransferDialog(true)}
              >
                <Mail className="w-4 h-4 mr-2" />
                Enviar por Email
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {transactions?.map((transaction) => {
            const typeInfo = transactionTypeInfo[transaction.transaction_type];
            const Icon = typeInfo.icon;

            return (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
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
                <p className="font-semibold text-primary-500">
                  +{transaction.amount} FITs
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar QR Code para Transferência</DialogTitle>
            <DialogDescription>
              Digite a quantidade de FITs que deseja transferir
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="number"
              placeholder="Quantidade de FITs"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
            />
            <Button onClick={handleCreateQRCode} className="w-full">
              Gerar QR Code
            </Button>
            {qrCodeDataUrl && (
              <div className="flex justify-center">
                <img src={qrCodeDataUrl} alt="QR Code" className="w-48 h-48" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Transfer Dialog */}
      <Dialog open={showEmailTransferDialog} onOpenChange={setShowEmailTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir FITs por Email</DialogTitle>
            <DialogDescription>
              Digite o email do destinatário e a quantidade de FITs
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="email"
              placeholder="Email do destinatário"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Quantidade de FITs"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
            />
            <Button onClick={handleEmailTransfer} className="w-full">
              Enviar FITs
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scan Dialog */}
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
