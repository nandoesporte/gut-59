
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Professional } from "@/components/admin/types";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserRound } from "lucide-react";

export const ProfessionalsSection = () => {
  const { data: professionals, isLoading } = useQuery({
    queryKey: ['professionals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('status', 'active')
        .order('display_order');
      
      if (error) throw error;
      return data as Professional[];
    },
  });

  if (isLoading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold text-primary-700 mb-6">Nossa Equipe</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {professionals?.map((professional) => (
          <Card key={professional.id} className="bg-white/70 backdrop-blur-lg border border-gray-100 shadow-lg">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <Avatar className="w-24 h-24 mb-4">
                <AvatarImage src={professional.photo_url || ''} alt={professional.name} />
                <AvatarFallback>
                  <UserRound className="w-12 h-12 text-gray-400" />
                </AvatarFallback>
              </Avatar>
              <h3 className="font-semibold text-lg mb-1">{professional.name}</h3>
              <p className="text-primary-600 text-sm mb-2">{professional.title}</p>
              {professional.description && (
                <p className="text-gray-600 text-sm">{professional.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
