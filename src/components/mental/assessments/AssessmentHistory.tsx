
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Loader2, Calendar, Filter, History } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { HealthAssessment } from './AssessmentTypes';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const AssessmentHistory = () => {
  const [assessments, setAssessments] = useState<HealthAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log("Usuário não autenticado");
          setLoading(false);
          return;
        }

        let query = supabase
          .from('health_assessments')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (filterType !== 'all') {
          query = query.eq('assessment_type', filterType);
        }
        
        const { data, error } = await query;
          
        if (error) {
          console.error("Erro ao buscar avaliações:", error);
        } else if (data) {
          console.log("Avaliações encontradas:", data.length); // Debug log
          setAssessments(data as HealthAssessment[]);
        }
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessments();
  }, [filterType]);

  const getAssessmentLevel = (type: string, score: number) => {
    if (type === 'burnout') {
      if (score <= 20) return 'Baixo';
      if (score <= 35) return 'Moderado';
      if (score <= 50) return 'Alto';
      return 'Severo';
    } else if (type === 'anxiety' || type === 'depression') {
      if (score <= 4) return 'Baixo';
      if (score <= 9) return 'Moderado';
      if (score <= 14) return 'Alto';
      return 'Severo';
    } else if (type === 'stress') {
      if (score <= 13) return 'Baixo';
      if (score <= 26) return 'Moderado';
      if (score <= 40) return 'Alto';
      return 'Severo';
    }
    return 'Desconhecido';
  };
  
  const getAssessmentTypeName = (type: string) => {
    switch (type) {
      case 'burnout': return 'Burnout';
      case 'anxiety': return 'Ansiedade';
      case 'stress': return 'Estresse';
      case 'depression': return 'Depressão';
      default: return type;
    }
  };
  
  const getAssessmentBgColor = (level: string) => {
    switch (level) {
      case 'Baixo': return 'bg-green-50';
      case 'Moderado': return 'bg-amber-50';
      case 'Alto': return 'bg-orange-50';
      case 'Severo': return 'bg-red-50';
      default: return 'bg-gray-50';
    }
  };
  
  const getAssessmentTextColor = (level: string) => {
    switch (level) {
      case 'Baixo': return 'text-green-700';
      case 'Moderado': return 'text-amber-700';
      case 'Alto': return 'text-orange-700';
      case 'Severo': return 'text-red-700';
      default: return 'text-gray-700';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Avaliações
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px] h-8 text-sm">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="burnout">Burnout</SelectItem>
                <SelectItem value="anxiety">Ansiedade</SelectItem>
                <SelectItem value="stress">Estresse</SelectItem>
                <SelectItem value="depression">Depressão</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : assessments.length > 0 ? (
          <div className="space-y-3">
            {assessments.map((assessment) => {
              const level = getAssessmentLevel(assessment.assessment_type, assessment.score);
              return (
                <div 
                  key={assessment.id} 
                  className={`${getAssessmentBgColor(level)} rounded-lg p-4 cursor-pointer hover:shadow-md transition-all`}
                  onClick={() => navigate(`/mental?tab=assessments&type=${assessment.assessment_type}`)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{getAssessmentTypeName(assessment.assessment_type)}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`font-semibold ${getAssessmentTextColor(level)}`}>
                          {level}
                        </span>
                        <span className="text-xs text-gray-500">
                          Pontuação: {assessment.score}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-gray-500 flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {format(new Date(assessment.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(assessment.created_at), "HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <span className="sr-only">Ver detalhes</span>
                        <BarChart className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhuma avaliação encontrada.</p>
            <p className="mt-2 text-sm">Faça uma avaliação para monitorar sua saúde mental.</p>
            <Button 
              onClick={() => navigate('/mental?tab=assessments')} 
              variant="outline" 
              className="mt-4"
            >
              Fazer avaliação
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
