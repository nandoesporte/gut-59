
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { DietaryPreferences } from "./types";

interface DietaryPreferencesFormProps {
  onSubmit: (preferences: DietaryPreferences) => void;
  onBack: () => void;
}

export const DietaryPreferencesForm = ({ onSubmit, onBack }: DietaryPreferencesFormProps) => {
  const [preferences, setPreferences] = useState<DietaryPreferences>({
    hasAllergies: false,
    allergies: [],
    dietaryRestrictions: [],
    trainingTime: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAllergiesChange = (checked: boolean) => {
    setPreferences(prev => ({
      ...prev,
      hasAllergies: checked,
      allergies: checked ? prev.allergies : []
    }));
  };

  const handleAllergiesInput = (value: string) => {
    setPreferences(prev => ({
      ...prev,
      allergies: value.split(',').map(item => item.trim())
    }));
  };

  const handleRestrictionsInput = (value: string) => {
    setPreferences(prev => ({
      ...prev,
      dietaryRestrictions: value.split(',').map(item => item.trim())
    }));
  };

  const handleTimeChange = (value: string) => {
    setPreferences(prev => ({
      ...prev,
      trainingTime: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      console.log("Enviando preferências dietéticas:", preferences);
      await onSubmit(preferences);
    } catch (error) {
      console.error("Erro ao enviar preferências:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Preferências Alimentares</h3>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
          <div className="flex-1 p-4 rounded-lg border bg-card hover:border-green-200 transition-colors">
            <div className="flex items-center space-x-2">
              <Switch
                id="allergies"
                checked={preferences.hasAllergies}
                onCheckedChange={handleAllergiesChange}
                className="data-[state=checked]:bg-green-500"
              />
              <Label htmlFor="allergies">Possui alergias alimentares?</Label>
            </div>

            {preferences.hasAllergies && (
              <div className="mt-4 space-y-2">
                <Label htmlFor="allergiesList">Liste suas alergias (separadas por vírgula)</Label>
                <Input
                  id="allergiesList"
                  placeholder="Ex: amendoim, leite, ovos"
                  value={preferences.allergies.join(', ')}
                  onChange={(e) => handleAllergiesInput(e.target.value)}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
          <div className="flex-1 p-4 rounded-lg border bg-card hover:border-green-200 transition-colors">
            <div className="space-y-2">
              <Label htmlFor="restrictions">Restrições alimentares (separadas por vírgula)</Label>
              <Input
                id="restrictions"
                placeholder="Ex: vegetariano, sem glúten"
                value={preferences.dietaryRestrictions.join(', ')}
                onChange={(e) => handleRestrictionsInput(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
          <div className="flex-1 p-4 rounded-lg border bg-card hover:border-green-200 transition-colors">
            <div className="space-y-2">
              <Label htmlFor="trainingTime">Horário de treino (opcional)</Label>
              <Input
                type="time"
                id="trainingTime"
                value={preferences.trainingTime || ''}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Button type="button" variant="outline" onClick={onBack} className="w-full sm:w-auto">
          Voltar
        </Button>
        <Button 
          type="submit" 
          className="w-full sm:w-auto bg-green-500 hover:bg-green-600"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Processando..." : "Continuar"}
        </Button>
      </div>
    </form>
  );
};
