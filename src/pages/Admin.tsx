
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UsersTab } from "@/components/admin/UsersTab";
import { TrainingTab } from "@/components/admin/TrainingTab";
import { ProfessionalsTab } from "@/components/admin/professionals/ProfessionalsTab";
import { PaymentSettingsTab } from "@/components/admin/PaymentSettingsTab";
import { AIAgentsTab } from "@/components/admin/ai-agents/AIAgentsTab";
import { MentalHealthTab } from "@/components/admin/mental/MentalHealthTab";
import { FoodPreferencesTab } from "@/components/admin/food/FoodPreferencesTab";
import { HealthAssessmentsTab } from "@/components/admin/mental/HealthAssessmentsTab";

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      try {
        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          toast.error('Você precisa estar logado para acessar esta página');
          navigate('/');
          return;
        }

        const { data, error } = await supabase.rpc('has_role', { role: 'admin' });
        
        if (error) {
          console.error('Error checking admin role:', error);
          toast.error('Erro ao verificar permissões');
          navigate('/');
          return;
        }

        setIsAdmin(data);
        if (!data) {
          toast.error('Acesso não autorizado');
          navigate('/');
        }
      } catch (error) {
        console.error('Error in checkAdminRole:', error);
        toast.error('Erro ao verificar permissões');
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminRole();
  }, [navigate]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Painel Administrativo</h1>
      <Tabs defaultValue="users">
        <TabsList className="mb-4 flex flex-wrap">
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="training">Instruções</TabsTrigger>
          <TabsTrigger value="professionals">Profissionais</TabsTrigger>
          <TabsTrigger value="payments">Pagamentos</TabsTrigger>
          <TabsTrigger value="ai-agents">Agentes de IA</TabsTrigger>
          <TabsTrigger value="mental-health">Saúde Mental</TabsTrigger>
          <TabsTrigger value="health-assessments">Avaliações de Saúde</TabsTrigger>
          <TabsTrigger value="food-preferences">Preferências Alimentares</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="training">
          <TrainingTab />
        </TabsContent>
        <TabsContent value="professionals">
          <ProfessionalsTab />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentSettingsTab />
        </TabsContent>
        <TabsContent value="ai-agents">
          <AIAgentsTab />
        </TabsContent>
        <TabsContent value="mental-health">
          <MentalHealthTab />
        </TabsContent>
        <TabsContent value="health-assessments">
          <HealthAssessmentsTab />
        </TabsContent>
        <TabsContent value="food-preferences">
          <FoodPreferencesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
