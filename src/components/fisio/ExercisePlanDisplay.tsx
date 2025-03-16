
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FisioPreferences } from '@/components/fisio/types';
import { Loader2, ArrowLeft, Download, BookOpen, Dumbbell, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePaymentHandling } from '@/components/menu/hooks/usePaymentHandling';
import type { RehabPlan } from './types/rehab-plan';
import { formatImageUrl } from '@/utils/imageUtils';

interface ExercisePlanDisplayProps {
  preferences: FisioPreferences;
  onReset: () => void;
}

export const ExercisePlanDisplay: React.FC<ExercisePlanDisplayProps> = ({ preferences, onReset }) => {
  const [plan, setPlan] = useState<RehabPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDay, setActiveDay] = useState('overview');
  const [loadingText, setLoadingText] = useState('Gerando seu plano de reabilitação...');
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { hasPaid, isProcessingPayment, handlePaymentAndContinue, showConfirmation, setShowConfirmation } = 
    usePaymentHandling('rehabilitation');

  const generateRehabPlan = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const userData = user ? {
        id: user.id,
        email: user.email,
      } : null;
      
      setLoadingText('Analisando suas preferências...');
      
      const timeout1 = setTimeout(() => {
        if (isLoading) setLoadingText('Selecionando exercícios apropriados...');
      }, 5000);
      
      const timeout2 = setTimeout(() => {
        if (isLoading) setLoadingText('Criando seu plano personalizado...');
      }, 10000);
      
      const simplifiedPreferences = {
        joint_area: preferences.joint_area,
        condition: preferences.condition || 'general',
        pain_level: preferences.pain_level || 0,
        mobility_level: preferences.mobility_level || 'moderate',
      };
      
      console.log('Enviando requisição de plano de reabilitação com preferências:', simplifiedPreferences);
      
      const response = await supabase.functions.invoke('generate-rehab-plan-groq', {
        body: { preferences: simplifiedPreferences, userData },
      });
      
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      
      if (response.error) {
        console.error('Erro na resposta de generate-rehab-plan-groq:', response.error);
        throw new Error(response.error.message || 'Erro ao gerar plano de reabilitação');
      }
      
      console.log('Resposta de generate-rehab-plan-groq:', response.data);
      
      if (!response.data) {
        throw new Error('Nenhum dado retornado pelo gerador de plano de reabilitação');
      }
      
      setPlan(response.data);
      
    } catch (error) {
      console.error('Erro ao gerar plano de reabilitação:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido';
      
      if (errorMessage.includes('context_length_exceeded')) {
        setError('A geração do plano falhou devido à complexidade. Por favor, tente com preferências mais simples ou tente novamente mais tarde.');
      } else if (errorMessage.includes('Max number of functions reached')) {
        setError('O serviço está atualmente em capacidade máxima. Seu plano será gerado usando um método alternativo. Por favor, tente novamente em alguns momentos.');
      } else if (errorMessage.includes('no data returned') || errorMessage.includes('No data returned')) {
        setError('Falha ao gerar dados de reabilitação. Por favor, tente novamente com preferências diferentes.');
      } else {
        setError(errorMessage);
      }
      
      toast.error('Falha ao gerar plano', {
        description: 'Por favor, tente novamente mais tarde ou entre em contato com o suporte se o problema persistir.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    generateRehabPlan();
  };

  useEffect(() => {
    if (hasPaid && !plan) {
      generateRehabPlan();
    }
  }, [hasPaid]);

  const checkPaymentAndGeneratePlan = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data: counts, error: countError } = await supabase
        .from('plan_generation_counts')
        .select('rehabilitation_count')
        .eq('user_id', user.id)
        .maybeSingle();

      if (countError) {
        console.error('Erro ao verificar contagens de plano:', countError);
      }

      const { data: paymentSettingData, error: paymentSettingError } = await supabase
        .rpc('get_payment_setting', { setting_name_param: 'payment_enabled' });
      
      if (paymentSettingError) {
        console.error('Erro ao buscar configurações de pagamento:', paymentSettingError);
        console.log('Configuração de pagamento de reabilitação: false');
      } else {
        console.log('Configuração de pagamento de reabilitação:', paymentSettingData);
      }
      
      const paymentGloballyEnabled = paymentSettingData === null ? true : paymentSettingData;
      
      console.log('Pagamento globalmente ativado:', paymentGloballyEnabled);
      
      if (!paymentGloballyEnabled || !counts || (counts.rehabilitation_count < 3)) {
        console.log('Gerando plano de reabilitação sem verificação de pagamento');
        await generateRehabPlan();
      } else {
        const { data: access, error: accessError } = await supabase
          .from('plan_access')
          .select('*')
          .eq('user_id', user.id)
          .eq('plan_type', 'rehabilitation')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (accessError && accessError.code !== 'PGRST116') {
          console.error('Erro ao verificar acesso ao plano:', accessError);
        }

        if (access && !access.payment_required) {
          console.log('Usuário tem acesso à geração de plano de reabilitação');
          await generateRehabPlan();
        } else {
          console.log('Usuário precisa pagar pela geração de plano de reabilitação');
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status de pagamento:', error);
      setIsLoading(false);
      setError('Falha ao verificar status de pagamento. Por favor, tente novamente mais tarde.');
    }
  };

  useEffect(() => {
    checkPaymentAndGeneratePlan();
  }, []);

  const renderExerciseList = (exercises) => {
    if (!exercises || exercises.length === 0) {
      return (
        <div className="p-4 text-center bg-gray-50 dark:bg-gray-800 rounded-md">
          <p className="text-muted-foreground">Nenhum exercício encontrado para esta seção.</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {exercises.map((exercise, i) => (
          <Card key={i} className="overflow-hidden bg-white dark:bg-gray-800">
            <div className="flex flex-col md:flex-row">
              {exercise.gifUrl && (
                <div className="md:w-1/3 flex justify-center items-center bg-gray-100 dark:bg-gray-700 p-4">
                  <img 
                    src={formatImageUrl(exercise.gifUrl)} 
                    alt={exercise.name || 'Exercício'} 
                    className="h-48 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                </div>
              )}
              <div className={`md:${exercise.gifUrl ? 'w-2/3' : 'w-full'} p-4`}>
                <h4 className="text-lg font-semibold flex items-center">
                  <Dumbbell className="w-5 h-5 mr-2 text-primary" />
                  {exercise.name || 'Nome do Exercício Ausente'}
                </h4>
                {exercise.difficulty && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Dificuldade: {exercise.difficulty}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 my-3">
                  <div className="bg-primary/10 rounded-md p-2 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Séries</div>
                    <div className="font-bold">{exercise.sets || '3'}</div>
                  </div>
                  <div className="bg-primary/10 rounded-md p-2 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Repetições</div>
                    <div className="font-bold">{exercise.reps || '10'}</div>
                  </div>
                  <div className="bg-primary/10 rounded-md p-2 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Descanso</div>
                    <div className="font-bold">
                      {exercise.rest_time_seconds ? 
                        `${Math.floor(exercise.rest_time_seconds / 60)}:${(exercise.rest_time_seconds % 60).toString().padStart(2, '0')}` : 
                        '1:00'}
                    </div>
                  </div>
                </div>
                {(exercise.description || exercise.notes) && (
                  <div className="mt-3 text-sm">
                    <p>{exercise.description || exercise.notes || 'Nenhuma descrição disponível.'}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h3 className="text-xl font-medium text-center">{loadingText}</h3>
        <p className="text-muted-foreground text-center mt-2">
          Isso pode levar até um minuto enquanto criamos um plano personalizado para você.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <AlertTriangle className="h-6 w-6 text-amber-500 mr-2" />
            Erro ao gerar plano
          </CardTitle>
          <CardDescription>
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Isso pode ser devido a sobrecarga temporária do serviço ou problemas técnicos.</p>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-4">
          <Button variant="outline" onClick={onReset} className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Alterar preferências
          </Button>
          <Button onClick={handleRetry} className="w-full sm:w-auto">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!hasPaid && !plan) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Pronto para criar seu plano de reabilitação</CardTitle>
          <CardDescription>
            Obtenha um plano de reabilitação personalizado para {preferences.joint_area} com exercícios adaptados às suas necessidades.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-primary/5 rounded-lg p-4">
                <h3 className="font-medium text-lg mb-2">Suas preferências</h3>
                <ul className="space-y-2">
                  <li><span className="font-medium">Área articular:</span> {preferences.joint_area}</li>
                  <li><span className="font-medium">Foco da reabilitação:</span> {preferences.condition || 'Recuperação geral'}</li>
                  {preferences.pain_level && (
                    <li><span className="font-medium">Nível de dor:</span> {preferences.pain_level}/10</li>
                  )}
                </ul>
              </div>
              <div className="bg-primary/5 rounded-lg p-4">
                <h3 className="font-medium text-lg mb-2">O que você receberá</h3>
                <ul className="space-y-2">
                  <li>⭐ Exercícios de reabilitação personalizados</li>
                  <li>⭐ Estrutura de acompanhamento de progresso</li>
                  <li>⭐ Instruções detalhadas com visuais</li>
                  <li>⭐ Recomendações específicas para sua condição</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-4">
          <Button variant="outline" onClick={onReset} className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Alterar preferências
          </Button>
          <Button 
            onClick={handlePaymentAndContinue} 
            disabled={isProcessingPayment}
            className="w-full sm:w-auto"
          >
            {isProcessingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isProcessingPayment ? 'Processando...' : 'Continuar'}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-medium">Algo deu errado</h3>
          <p className="text-muted-foreground">
            Não foi possível gerar seu plano de reabilitação. Por favor, tente novamente.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <Button onClick={onReset}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Recomeçar
            </Button>
            <Button onClick={handleRetry} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const days = plan.days || {};
  const dayKeys = Object.keys(days).sort((a, b) => {
    const aNum = parseInt(a.replace('day', ''));
    const bNum = parseInt(b.replace('day', ''));
    return aNum - bNum;
  });

  if (dayKeys.length === 0 && plan.rehab_sessions && plan.rehab_sessions.length > 0) {
    console.log('Criando estrutura de dias a partir de sessões de reabilitação');
    plan.days = {};
    
    plan.rehab_sessions.forEach((session, index) => {
      const dayKey = `day${index + 1}`;
      plan.days[dayKey] = {
        notes: `Exercícios do Dia ${index + 1}`,
        exercises: [{
          title: "Sessão de Reabilitação",
          exercises: session.exercises || []
        }]
      };
    });
  }

  if (!plan.days || Object.keys(plan.days).length === 0) {
    console.log('Criando estrutura de plano alternativa');
    plan.days = {
      day1: {
        notes: "Exercícios de reabilitação padrão",
        exercises: [{
          title: "Exercícios",
          exercises: plan.exercises || []
        }]
      }
    };
  }
  
  const updatedDayKeys = Object.keys(plan.days || {}).sort((a, b) => {
    const aNum = parseInt(a.replace('day', ''));
    const bNum = parseInt(b.replace('day', ''));
    return aNum - bNum;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Seu Plano de Reabilitação</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onReset} size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Salvar PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" value={activeDay} onValueChange={setActiveDay}>
        <TabsList className="mb-4 flex flex-wrap">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            <BookOpen className="h-4 w-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          {updatedDayKeys.map((day) => (
            <TabsTrigger 
              key={day} 
              value={day}
              className="data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              Dia {day.replace('day', '')}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Visão Geral do Plano de Reabilitação</CardTitle>
              <CardDescription>
                Para {preferences.joint_area} - {preferences.condition || 'Recuperação'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose dark:prose-invert max-w-none">
                {plan.overview ? (
                  <p>{plan.overview}</p>
                ) : (
                  <p>Este plano de reabilitação foi desenvolvido para ajudar a melhorar sua condição de {preferences.joint_area} e alcançar recuperação para {preferences.condition || 'sua condição'}.</p>
                )}
                
                {plan.recommendations && (
                  <div className="mt-4">
                    <h3 className="text-lg font-medium mb-2">Recomendações</h3>
                    {Array.isArray(plan.recommendations) ? (
                      <ul className="list-disc pl-5 space-y-1">
                        {plan.recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>{plan.recommendations}</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {plan.rehab_sessions && plan.rehab_sessions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Visão Geral dos Exercícios</CardTitle>
                <CardDescription>
                  Todos os exercícios em seu programa de reabilitação
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderExerciseList(
                  plan.rehab_sessions.flatMap(session => session.exercises || [])
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {updatedDayKeys.map((day) => {
          const dayData = plan.days?.[day];
          if (!dayData) return null;
          
          return (
            <TabsContent key={day} value={day} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Dia {day.replace('day', '')} - Programa de Exercícios</CardTitle>
                  <CardDescription>
                    {dayData.notes || `Exercícios para o dia ${day.replace('day', '')}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {dayData.exercises && dayData.exercises.map((group, i) => (
                    <div key={i} className="space-y-4">
                      <h3 className="text-lg font-medium">{group.title || 'Grupo de Exercícios'}</h3>
                      {renderExerciseList(group.exercises || [])}
                    </div>
                  ))}
                  
                  {!dayData.exercises && (
                    <div className="p-4 text-center bg-gray-50 dark:bg-gray-800 rounded-md">
                      <p className="text-muted-foreground">Nenhum exercício encontrado para este dia.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};
