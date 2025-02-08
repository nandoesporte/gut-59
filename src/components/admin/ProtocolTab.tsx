
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProtocolPhase, DayData } from "./types";
import { PhasesManagement } from "./protocol/PhasesManagement";
import { DaysManagement } from "./protocol/DaysManagement";

export const ProtocolTab = () => {
  const [activeTab, setActiveTab] = useState("phases");

  const { data: phases, isLoading: phasesLoading } = useQuery({
    queryKey: ["protocol-phases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("protocol_phases")
        .select("*")
        .order("day_start");
      if (error) throw error;
      return data as ProtocolPhase[];
    },
  });

  const { data: days, isLoading: daysLoading } = useQuery({
    queryKey: ["protocol-days"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("protocol_days")
        .select("*")
        .order("day");
      if (error) throw error;
      return data as DayData[];
    },
  });

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="phases">Fases do Protocolo</TabsTrigger>
        <TabsTrigger value="modulation">Protocolo de Modulação</TabsTrigger>
      </TabsList>

      <TabsContent value="phases">
        <PhasesManagement phases={phases} isLoading={phasesLoading} />
      </TabsContent>

      <TabsContent value="modulation">
        <DaysManagement
          days={days}
          phases={phases}
          isLoading={daysLoading}
        />
      </TabsContent>
    </Tabs>
  );
};

