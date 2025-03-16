
import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { FisioPreferences, JointArea, RehabGoal } from './types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';

const formSchema = z.object({
  joint_area: z.string().min(2, { message: 'Por favor, selecione uma área articular' }),
  condition: z.string().optional(),
  pain_level: z.coerce.number().min(0).max(10).optional(),
  mobility_level: z.string().optional(),
  goal: z.string().optional(),
});

interface FisioPreferencesFormProps {
  onSubmit: (data: FisioPreferences) => void;
}

const jointAreas = [
  { value: 'knee', label: 'Joelho' },
  { value: 'shoulder', label: 'Ombro' },
  { value: 'ankle_foot', label: 'Tornozelo/Pé' },
  { value: 'back', label: 'Coluna' },
  { value: 'hip', label: 'Quadril' },
  { value: 'elbow', label: 'Cotovelo' },
  { value: 'wrist', label: 'Pulso' },
  { value: 'neck', label: 'Pescoço' },
];

const kneeConditions = [
  { value: 'acl_tear', label: 'Lesão do Ligamento Cruzado Anterior (LCA)' },
  { value: 'meniscus_tear', label: 'Lesão de Menisco' },
  { value: 'patellofemoral', label: 'Síndrome Patelofemoral' },
  { value: 'osteoarthritis', label: 'Osteoartrite' },
  { value: 'tendinitis', label: 'Tendinite Patelar' },
  { value: 'post_surgery', label: 'Pós-Cirurgia' },
  { value: 'general', label: 'Recuperação Geral' },
];

const shoulderConditions = [
  { value: 'rotator_cuff', label: 'Lesão do Manguito Rotador' },
  { value: 'impingement', label: 'Síndrome do Impacto' },
  { value: 'frozen_shoulder', label: 'Capsulite Adesiva (Ombro Congelado)' },
  { value: 'dislocation', label: 'Instabilidade/Luxação' },
  { value: 'general', label: 'Recuperação Geral' },
];

const ankleFootConditions = [
  { value: 'sprain', label: 'Entorse de Tornozelo' },
  { value: 'plantar_fasciitis', label: 'Fascite Plantar' },
  { value: 'achilles_tendinitis', label: 'Tendinite de Aquiles' },
  { value: 'general', label: 'Recuperação Geral' },
];

const backConditions = [
  { value: 'lumbar_strain', label: 'Lombalgia' },
  { value: 'disc_herniation', label: 'Hérnia de Disco' },
  { value: 'sciatica', label: 'Ciática' },
  { value: 'scoliosis', label: 'Escoliose' },
  { value: 'general', label: 'Recuperação Geral' },
];

const hipConditions = [
  { value: 'osteoarthritis', label: 'Osteoartrite' },
  { value: 'impingement', label: 'Síndrome do Impacto Femoroacetabular' },
  { value: 'bursitis', label: 'Bursite' },
  { value: 'labral_tear', label: 'Lesão Labral' },
  { value: 'general', label: 'Recuperação Geral' },
];

const elbowConditions = [
  { value: 'tennis_elbow', label: 'Epicondilite Lateral (Cotovelo de Tenista)' },
  { value: 'golfers_elbow', label: 'Epicondilite Medial (Cotovelo de Golfista)' },
  { value: 'ucl_injury', label: 'Lesão do Ligamento Colateral Ulnar' },
  { value: 'general', label: 'Recuperação Geral' },
];

const wristConditions = [
  { value: 'carpal_tunnel', label: 'Síndrome do Túnel do Carpo' },
  { value: 'tendinitis', label: 'Tendinite de De Quervain' },
  { value: 'sprain', label: 'Entorse de Pulso' },
  { value: 'general', label: 'Recuperação Geral' },
];

const neckConditions = [
  { value: 'strain', label: 'Tensão Cervical' },
  { value: 'herniated_disc', label: 'Hérnia de Disco Cervical' },
  { value: 'whiplash', label: 'Lesão em Chicote' },
  { value: 'general', label: 'Recuperação Geral' },
];

const goals = [
  { value: 'pain_relief', label: 'Alívio da Dor' },
  { value: 'mobility', label: 'Melhorar Mobilidade' },
  { value: 'strength', label: 'Aumentar Força' },
  { value: 'function', label: 'Restaurar Função' },
  { value: 'return_to_sport', label: 'Retorno aos Esportes' },
  { value: 'prevent_injury', label: 'Prevenir Lesões' },
];

const mobilityLevels = [
  { value: 'minimal', label: 'Mínima - Movimentos muito limitados' },
  { value: 'limited', label: 'Limitada - Alguns movimentos possíveis com dor' },
  { value: 'moderate', label: 'Moderada - Movimentos razoáveis com alguma dor' },
  { value: 'good', label: 'Boa - Movimento quase normal com pouca dor' },
  { value: 'full', label: 'Completa - Movimento normal sem dor' },
];

export function FisioPreferencesForm({ onSubmit }: FisioPreferencesFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      joint_area: '',
      condition: undefined,
      pain_level: 5,
      mobility_level: 'moderate',
      goal: 'pain_relief',
    },
  });

  const watchJointArea = form.watch('joint_area');
  
  // Função para obter as condições específicas para a área articular selecionada
  const getConditionsForJointArea = (jointArea: string | undefined) => {
    switch (jointArea) {
      case 'knee':
        return kneeConditions;
      case 'shoulder':
        return shoulderConditions;
      case 'ankle_foot':
        return ankleFootConditions;
      case 'back':
        return backConditions;
      case 'hip':
        return hipConditions;
      case 'elbow':
        return elbowConditions;
      case 'wrist':
        return wristConditions;
      case 'neck':
        return neckConditions;
      default:
        return [];
    }
  };

  function handleSubmit(values: z.infer<typeof formSchema>) {
    onSubmit(values as FisioPreferences);
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Preferências de Reabilitação</CardTitle>
        <CardDescription>
          Personalize seu plano de reabilitação respondendo as perguntas abaixo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="joint_area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Área Articular</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a área articular" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {jointAreas.map((area) => (
                        <SelectItem key={area.value} value={area.value}>
                          {area.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    A área principal que precisa de reabilitação
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchJointArea && (
              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condição Específica</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a condição específica" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getConditionsForJointArea(watchJointArea).map((condition) => (
                          <SelectItem key={condition.value} value={condition.value}>
                            {condition.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Sua condição específica para este plano de reabilitação
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="pain_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nível de Dor (0-10)</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Slider
                        min={0}
                        max={10}
                        step={1}
                        defaultValue={[field.value || 5]}
                        onValueChange={(vals) => field.onChange(vals[0])}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Sem Dor (0)</span>
                        <span>Dor Moderada (5)</span>
                        <span>Dor Severa (10)</span>
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Avalie seu nível de dor atual na escala de 0 a 10
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mobility_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nível de Mobilidade</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione seu nível de mobilidade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mobilityLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Seu nível atual de mobilidade na área afetada
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objetivo Principal</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione seu objetivo principal" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {goals.map((goal) => (
                        <SelectItem key={goal.value} value={goal.value}>
                          {goal.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    O principal objetivo que você deseja alcançar com este plano
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">Gerar Plano de Reabilitação</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
