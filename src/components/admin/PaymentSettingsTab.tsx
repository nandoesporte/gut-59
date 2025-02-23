
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentSettingsList } from "./payment-settings/PaymentSettingsList";

export const PaymentSettingsTab = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações de Pagamento</CardTitle>
      </CardHeader>
      <CardContent>
        <PaymentSettingsList />
      </CardContent>
    </Card>
  );
};
