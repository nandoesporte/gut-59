
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
import { MealsTab } from "@/components/admin/MealsTab";
import { WaterIntakeTab } from "@/components/admin/WaterIntakeTab";

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdminRole = async () => {
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
    };

    checkAdminRole();
  }, [navigate]);

  if (isAdmin === null) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Painel Administrativo</h1>
      
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="symptoms">Sintomas</TabsTrigger>
          <TabsTrigger value="meals">Diário Alimentar</TabsTrigger>
          <TabsTrigger value="water">Ingestão de Água</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UsersTab />
        </TabsContent>

        <TabsContent value="symptoms">
          <SymptomsTab />
        </TabsContent>

        <TabsContent value="meals">
          <MealsTab />
        </TabsContent>

        <TabsContent value="water">
          <WaterIntakeTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
