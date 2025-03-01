
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertCircle, ChevronLeft, Brain } from "lucide-react";
import type { DietaryPreferences } from "./types";

type DietaryPreferencesFormProps = {
  onSubmit: (preferences: DietaryPreferences) => Promise<boolean>;
  onBack: () => void;
  useNutriPlus?: boolean;
  setUseNutriPlus?: (value: boolean) => void;
};

export const DietaryPreferencesForm = ({ 
  onSubmit,
  onBack,
  useNutriPlus = false,
  setUseNutriPlus
}: DietaryPreferencesFormProps) => {
  const [hasAllergies, setHasAllergies] = useState<boolean>(false);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState<string>("");
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [trainingTime, setTrainingTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [localUseNutriPlus, setLocalUseNutriPlus] = useState<boolean>(useNutriPlus);
  
  const commonRestrictions = [
    { value: "vegetarian", label: "Vegetariano" },
    { value: "vegan", label: "Vegano" },
    { value: "dairy-free", label: "Sem lactose" },
    { value: "gluten-free", label: "Sem glúten" },
    { value: "low-carb", label: "Baixo carboidrato" },
    { value: "keto", label: "Cetogênica" },
    { value: "paleo", label: "Paleolítica" }
  ];

  const trainingTimeOptions = [
    { value: "06:00", label: "Manhã (6h)" },
    { value: "08:00", label: "Manhã (8h)" },
    { value: "12:00", label: "Meio-dia (12h)" },
    { value: "16:00", label: "Tarde (16h)" },
    { value: "18:00", label: "Tarde (18h)" },
    { value: "20:00", label: "Noite (20h)" },
    { value: "none", label: "Não treino regularmente" }
  ];

  const handleAddAllergy = () => {
    if (allergyInput.trim() && !allergies.includes(allergyInput.trim())) {
      setAllergies([...allergies, allergyInput.trim()]);
      setAllergyInput("");
    }
  };

  const handleRemoveAllergy = (allergy: string) => {
    setAllergies(allergies.filter(a => a !== allergy));
  };

  const handleRestrictionToggle = (restriction: string) => {
    if (dietaryRestrictions.includes(restriction)) {
      setDietaryRestrictions(dietaryRestrictions.filter(r => r !== restriction));
    } else {
      setDietaryRestrictions([...dietaryRestrictions, restriction]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Atualizar o estado do Nutri+ no componente pai, se disponível
      if (setUseNutriPlus) {
        setUseNutriPlus(localUseNutriPlus);
      }
      
      const preferences: DietaryPreferences = {
        hasAllergies,
        allergies: hasAllergies ? allergies : [],
        dietaryRestrictions,
        trainingTime: trainingTime === "none" ? null : trainingTime,
        useNutriPlus: localUseNutriPlus
      };
      
      const result = await onSubmit(preferences);
      if (!result) {
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Erro ao enviar preferências:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Seção Nutri+ */}
      {setUseNutriPlus && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 shadow-sm">
          <div className="flex items-start space-x-3">
            <Brain className="h-5 w-5 text-blue-600 mt-1" />
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-blue-800">Nutri+ (Agente Avançado)</h3>
                <Switch 
                  checked={localUseNutriPlus} 
                  onCheckedChange={setLocalUseNutriPlus}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Ativar o Nutri+ para um plano alimentar mais completo e personalizado com análises nutricionais avançadas.
              </p>
              {localUseNutriPlus && (
                <div className="mt-2 text-xs text-blue-600 flex items-center">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Recomendações nutricionais avançadas ativadas
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Alergias */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="has-allergies" className="text-base font-medium">
            Você tem alguma alergia alimentar?
          </Label>
          <Switch
            id="has-allergies"
            checked={hasAllergies}
            onCheckedChange={setHasAllergies}
          />
        </div>

        {hasAllergies && (
          <div className="space-y-3 mt-3">
            <div className="flex space-x-2">
              <input
                type="text"
                value={allergyInput}
                onChange={(e) => setAllergyInput(e.target.value)}
                placeholder="Digite uma alergia (ex: amendoim)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Button
                type="button"
                onClick={handleAddAllergy}
                className="bg-blue-500 hover:bg-blue-600"
              >
                Adicionar
              </Button>
            </div>

            {allergies.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-gray-600 mb-1">Alergias adicionadas:</p>
                <div className="flex flex-wrap gap-2">
                  {allergies.map((allergy) => (
                    <div
                      key={allergy}
                      className="bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm flex items-center"
                    >
                      {allergy}
                      <button
                        type="button"
                        onClick={() => handleRemoveAllergy(allergy)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Restrições Alimentares */}
      <div className="space-y-4">
        <h3 className="text-base font-medium">Restrições Alimentares</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          {commonRestrictions.map((restriction) => (
            <div
              key={restriction.value}
              className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                dietaryRestrictions.includes(restriction.value)
                  ? "bg-blue-50 border-blue-200"
                  : "border-gray-200 hover:border-blue-200"
              }`}
              onClick={() => handleRestrictionToggle(restriction.value)}
            >
              <div className="flex items-center justify-between">
                <span>{restriction.label}</span>
                {dietaryRestrictions.includes(restriction.value) && (
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Horário de Treino */}
      <div className="space-y-2">
        <Label htmlFor="training-time" className="text-base font-medium">
          Horário de Treino
        </Label>
        <Select 
          onValueChange={setTrainingTime} 
          defaultValue={trainingTime || undefined}
        >
          <SelectTrigger id="training-time" className="w-full">
            <SelectValue placeholder="Selecione um horário de treino" />
          </SelectTrigger>
          <SelectContent>
            {trainingTimeOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-gray-500">
          Isso ajudará a adaptar suas refeições aos seus horários de treino.
        </p>
      </div>

      <div className="flex justify-between pt-4">
        <Button 
          type="button" 
          onClick={onBack}
          variant="outline"
          className="flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Button>

        <Button 
          type="submit" 
          className="bg-green-600 hover:bg-green-700"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Processando..." : "Gerar Plano Alimentar"}
        </Button>
      </div>
    </form>
  );
};
