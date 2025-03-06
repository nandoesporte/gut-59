
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  BrainCircuit, 
  ChevronDown, 
  CreditCard, 
  Dumbbell, 
  Home, 
  ListOrdered, 
  PanelRight, 
  Settings, 
  ShoppingBag, 
  Utensils, 
  Users, 
  HeartPulse,
  Brain
} from "lucide-react";
import { ReactNode, useState } from "react";

interface SidebarSectionProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}

const SidebarSection = ({ title, icon, children, defaultOpen = false }: SidebarSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between">
          <span className="flex items-center">
            <span className="mr-2">{icon}</span>
            {title}
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-8 py-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

export const AdminSidebar = () => {
  return (
    <aside className="w-64 border-r h-screen overflow-y-auto py-4 bg-background">
      <div className="flex flex-col space-y-1 px-2">
        <NavLink href="/admin" className="flex items-center p-2 rounded-md hover:bg-accent">
          <Home className="mr-2 h-5 w-5" />
          Dashboard
        </NavLink>

        <SidebarSection title="Treinamento" icon={<Dumbbell className="h-5 w-5" />}>
          <NavLink href="/admin/exercises" className="flex items-center p-2 rounded-md hover:bg-accent">
            <ListOrdered className="mr-2 h-4 w-4" />
            Exercícios
          </NavLink>
          <NavLink href="/admin/training/modules" className="flex items-center p-2 rounded-md hover:bg-accent">
            <PanelRight className="mr-2 h-4 w-4" />
            Módulos
          </NavLink>
          <NavLink href="/admin/training/ai-settings" className="flex items-center p-2 rounded-md hover:bg-accent">
            <BrainCircuit className="mr-2 h-4 w-4" />
            Configurações IA
          </NavLink>
        </SidebarSection>

        <SidebarSection title="Fisioterapia" icon={<HeartPulse className="h-5 w-5" />}>
          <NavLink href="/admin/physio/exercises" className="flex items-center p-2 rounded-md hover:bg-accent">
            <ListOrdered className="mr-2 h-4 w-4" />
            Exercícios Fisio
          </NavLink>
        </SidebarSection>

        <SidebarSection title="Nutrição" icon={<Utensils className="h-5 w-5" />}>
          <NavLink href="/admin/food" className="flex items-center p-2 rounded-md hover:bg-accent">
            <ListOrdered className="mr-2 h-4 w-4" />
            Alimentos
          </NavLink>
          <NavLink href="/admin/food-groups" className="flex items-center p-2 rounded-md hover:bg-accent">
            <PanelRight className="mr-2 h-4 w-4" />
            Grupos Alimentares
          </NavLink>
        </SidebarSection>

        <SidebarSection title="Saúde Mental" icon={<Brain className="h-5 w-5" />}>
          <NavLink href="/admin/mental/modules" className="flex items-center p-2 rounded-md hover:bg-accent">
            <PanelRight className="mr-2 h-4 w-4" />
            Módulos
          </NavLink>
          <NavLink href="/admin/mental/resources" className="flex items-center p-2 rounded-md hover:bg-accent">
            <ListOrdered className="mr-2 h-4 w-4" />
            Recursos
          </NavLink>
          <NavLink href="/admin/mental/settings" className="flex items-center p-2 rounded-md hover:bg-accent">
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </NavLink>
        </SidebarSection>

        <SidebarSection title="E-commerce" icon={<ShoppingBag className="h-5 w-5" />}>
          <NavLink href="/admin/products" className="flex items-center p-2 rounded-md hover:bg-accent">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Produtos
          </NavLink>
          <NavLink href="/admin/orders" className="flex items-center p-2 rounded-md hover:bg-accent">
            <ListOrdered className="mr-2 h-4 w-4" />
            Pedidos
          </NavLink>
        </SidebarSection>

        <SidebarSection title="Usuários" icon={<Users className="h-5 w-5" />}>
          <NavLink href="/admin/users" className="flex items-center p-2 rounded-md hover:bg-accent">
            <Users className="mr-2 h-4 w-4" />
            Gerenciar Usuários
          </NavLink>
        </SidebarSection>

        <SidebarSection title="Pagamentos" icon={<CreditCard className="h-5 w-5" />}>
          <NavLink href="/admin/payment-settings" className="flex items-center p-2 rounded-md hover:bg-accent">
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </NavLink>
        </SidebarSection>

        <SidebarSection title="Agentes IA" icon={<BrainCircuit className="h-5 w-5" />}>
          <NavLink href="/admin/ai-agents" className="flex items-center p-2 rounded-md hover:bg-accent">
            <ListOrdered className="mr-2 h-4 w-4" />
            Gerenciar Prompts
          </NavLink>
        </SidebarSection>
      </div>
    </aside>
  );
};
