
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TimeInput } from "@/components/ui/time-input";

interface DietaryPreferencesFormProps {
  onSubmit: (preferences: DietaryPreferences) => void;
}

interface DietaryPreferences {
  hasAllergies: boolean;
  allergies: string[];
  dietaryRestrictions: string[];
  trainingTime: string | null;
}

export const DietaryPreferencesForm = ({ onSubmit }: DietaryPreferencesFormProps) => {
  const [preferences, setPreferences] = useState<DietaryPreferences>({
    hasAllergies: false,
    allergies: [],
    dietaryRestrictions: [],
    trainingTime: null,
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(preferences);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Preferências Alimentares</h3>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="allergies"
            checked={preferences.hasAllergies}
            onCheckedChange={handleAllergiesChange}
          />
          <Label htmlFor="allergies">Possui alergias alimentares?</Label>
        </div>

        {preferences.hasAllergies && (
          <div className="space-y-2">
            <Label htmlFor="allergiesList">Liste suas alergias (separadas por vírgula)</Label>
            <Input
              id="allergiesList"
              placeholder="Ex: amendoim, leite, ovos"
              value={preferences.allergies.join(', ')}
              onChange={(e) => handleAllergiesInput(e.target.value)}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="restrictions">Restrições alimentares (separadas por vírgula)</Label>
          <Input
            id="restrictions"
            placeholder="Ex: vegetariano, sem glúten"
            value={preferences.dietaryRestrictions.join(', ')}
            onChange={(e) => handleRestrictionsInput(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="trainingTime">Horário de treino (opcional)</Label>
          <Input
            type="time"
            id="trainingTime"
            value={preferences.trainingTime || ''}
            onChange={(e) => handleTimeChange(e.target.value)}
          />
        </div>
      </div>

      <Button type="submit">
        Continuar
      </Button>
    </form>
  );
};
