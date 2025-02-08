
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
import { SymptomsTab } from "@/components/admin/SymptomsTab";
import { ProtocolTab } from "@/components/admin/ProtocolTab";
import { WaterIntakeTab } from "@/components/admin/WaterIntakeTab";
import { MessagesTab } from "@/components/admin/MessagesTab";
import { MealsTab } from "@/components/admin/MealsTab";

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
      
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-6 mb-6">
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="symptoms">Sintomas</TabsTrigger>
          <TabsTrigger value="water">Ingestão de Água</TabsTrigger>
          <TabsTrigger value="protocol">Protocolo</TabsTrigger>
          <TabsTrigger value="messages">Mensagens</TabsTrigger>
          <TabsTrigger value="meals">Refeições</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UsersTab />
        </TabsContent>

        <TabsContent value="symptoms">
          <SymptomsTab />
        </TabsContent>

        <TabsContent value="water">
          <WaterIntakeTab />
        </TabsContent>

        <TabsContent value="protocol">
          <ProtocolTab />
        </TabsContent>

        <TabsContent value="messages">
          <MessagesTab />
        </TabsContent>

        <TabsContent value="meals">
          <MealsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
