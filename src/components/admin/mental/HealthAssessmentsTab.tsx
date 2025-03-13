
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Download, BarChart2, FileText, UserSearch } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { AssessmentResponse, HealthAssessment } from '@/components/mental/assessments/AssessmentTypes';
import { toast } from 'sonner';

interface AssessmentWithUser extends HealthAssessment {
  user_name?: string;
  user_email?: string;
}

export const HealthAssessmentsTab = () => {
  const [assessments, setAssessments] = useState<AssessmentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [userDetails, setUserDetails] = useState<Record<string, { name: string, email: string }>>({});

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('health_assessments')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Fetch user details for all assessments
      const userIds = [...new Set(data.map(item => item.user_id))];
      const userDetailsMap: Record<string, { name: string, email: string }> = {};
      
      for (const userId of userIds) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', userId)
          .single();
          
        if (userProfile) {
          userDetailsMap[userId] = {
            name: userProfile.name || 'Usuário sem nome',
            email: userProfile.email || 'Email não disponível'
          };
        }
      }
      
      setUserDetails(userDetailsMap);
      
      const assessmentsWithUsers = data.map((assessment: HealthAssessment) => ({
        ...assessment,
        user_name: userDetailsMap[assessment.user_id]?.name,
        user_email: userDetailsMap[assessment.user_id]?.email
      }));
      
      setAssessments(assessmentsWithUsers);
    } catch (error) {
      console.error("Error fetching assessments:", error);
      toast.error("Erro ao carregar as avaliações");
    } finally {
      setLoading(false);
    }
  };

  const filterAssessments = () => {
    if (activeTab === 'all') {
      return assessments;
    }
    return assessments.filter(a => a.assessment_type === activeTab);
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

  const getLevelName = (type: string, score: number) => {
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

  const getLevelColor = (type: string, score: number) => {
    const level = getLevelName(type, score);
    switch (level) {
      case 'Baixo': return 'text-green-600 bg-green-100';
      case 'Moderado': return 'text-amber-600 bg-amber-100';
      case 'Alto': return 'text-orange-600 bg-orange-100';
      case 'Severo': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const downloadCSV = () => {
    try {
      const data = filterAssessments();
      if (data.length === 0) {
        toast.error("Não há dados para exportar");
        return;
      }
      
      // Prepare CSV Headers
      let csv = 'Data,Usuário,Email,Tipo de Avaliação,Pontuação,Nível\n';
      
      // Add data rows
      data.forEach(assessment => {
        const row = [
          assessment.created_at ? format(new Date(assessment.created_at), 'dd/MM/yyyy HH:mm') : 'N/A',
          `"${assessment.user_name || 'Desconhecido'}"`,
          `"${assessment.user_email || 'N/A'}"`,
          getAssessmentTypeName(assessment.assessment_type),
          assessment.score,
          getLevelName(assessment.assessment_type, assessment.score)
        ];
        
        csv += row.join(',') + '\n';
      });
      
      // Create and download file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
      
      link.setAttribute('href', url);
      link.setAttribute('download', `avaliações-saúde-mental_${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Arquivo CSV baixado com sucesso");
    } catch (error) {
      console.error("Error downloading CSV:", error);
      toast.error("Erro ao baixar arquivo CSV");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">Avaliações de Saúde Mental</CardTitle>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={downloadCSV}
              disabled={loading || assessments.length === 0}
            >
              <Download className="h-4 w-4 mr-2" /> Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="burnout">Burnout</TabsTrigger>
              <TabsTrigger value="anxiety">Ansiedade</TabsTrigger>
              <TabsTrigger value="stress">Estresse</TabsTrigger>
              <TabsTrigger value="depression">Depressão</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab}>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : assessments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Nenhuma avaliação encontrada</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Pontuação</TableHead>
                        <TableHead>Nível</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterAssessments().map((assessment) => (
                        <TableRow key={assessment.id}>
                          <TableCell>
                            {assessment.created_at && 
                              format(new Date(assessment.created_at), 'dd/MM/yyyy HH:mm')}
                          </TableCell>
                          <TableCell>{assessment.user_name || 'Desconhecido'}</TableCell>
                          <TableCell>{assessment.user_email || 'N/A'}</TableCell>
                          <TableCell>{getAssessmentTypeName(assessment.assessment_type)}</TableCell>
                          <TableCell>{assessment.score}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              getLevelColor(assessment.assessment_type, assessment.score)
                            }`}>
                              {getLevelName(assessment.assessment_type, assessment.score)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Estatísticas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['burnout', 'anxiety', 'stress', 'depression'].map((type) => {
              const typeAssessments = assessments.filter(a => a.assessment_type === type);
              const totalCount = typeAssessments.length;
              
              // Count by level
              const levels = {
                'Baixo': 0,
                'Moderado': 0,
                'Alto': 0,
                'Severo': 0
              };
              
              typeAssessments.forEach(a => {
                const level = getLevelName(a.assessment_type, a.score);
                levels[level]++;
              });
              
              return (
                <Card key={type} className="overflow-hidden">
                  <CardHeader className={`py-4 ${
                    type === 'burnout' ? 'bg-amber-50' :
                    type === 'anxiety' ? 'bg-blue-50' :
                    type === 'stress' ? 'bg-green-50' :
                    'bg-purple-50'
                  }`}>
                    <CardTitle className="text-sm font-medium">
                      {getAssessmentTypeName(type)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <p className="text-xl font-bold">{totalCount}</p>
                      <p className="text-xs text-muted-foreground">avaliações realizadas</p>
                      
                      <div className="mt-4 space-y-1">
                        {Object.entries(levels).map(([level, count]) => (
                          <div key={level} className="flex justify-between items-center text-sm">
                            <span>{level}:</span>
                            <span className="font-medium">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
