
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useState } from "react";

interface PaymentSetting {
  id: string;
  plan_type: 'workout' | 'nutrition' | 'rehabilitation';
  price: number;
}

const planTypeLabels = {
  workout: 'Plano de Treino',
  nutrition: 'Plano Alimentar',
  rehabilitation: 'Plano de Reabilitação'
};

export const PaymentSettingsList = () => {
  const [settings, setSettings] = useState<PaymentSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPaymentSettings();
  }, []);

  const fetchPaymentSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_settings')
        .select('id, plan_type, price')
        .order('plan_type');

      if (error) throw error;
      setSettings((data || []) as PaymentSetting[]);
    } catch (error) {
      console.error('Error fetching payment settings:', error);
      toast.error('Erro ao carregar configurações de pagamento');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePriceChange = async (setting: PaymentSetting, newPrice: string) => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0) return;

    try {
      const { error } = await supabase
        .from('payment_settings')
        .update({ price })
        .eq('id', setting.id);

      if (error) throw error;

      setSettings(settings.map(s =>
        s.id === setting.id ? { ...s, price } : s
      ));

      toast.success('Preço atualizado com sucesso');
    } catch (error) {
      console.error('Error updating price:', error);
      toast.error('Erro ao atualizar preço');
    }
  };

  if (isLoading) {
    return <div className="text-center p-4">Carregando...</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo de Plano</TableHead>
            <TableHead>Preço (R$)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {settings.map((setting) => (
            <TableRow key={setting.id}>
              <TableCell>{planTypeLabels[setting.plan_type]}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={setting.price}
                  onChange={(e) => handlePriceChange(setting, e.target.value)}
                  className="w-24"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
