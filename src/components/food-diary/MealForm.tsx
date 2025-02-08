
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Camera } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface MealType {
  id: number;
  name: string;
  display_name: string;
  phase: number | null;
}

interface MealFormProps {
  loading: boolean;
  mealTypes: MealType[];
  onSubmit: () => void;
  mealType: string;
  setMealType: (value: string) => void;
  phase: string;
  setPhase: (value: string) => void;
  date: Date;
  setDate: (value: Date) => void;
  photoUrl: string | null;
  onPhotoCapture: (file: File) => void;
}

export const MealForm = ({
  loading,
  mealTypes,
  onSubmit,
  mealType,
  setMealType,
  phase,
  setPhase,
  date,
  setDate,
  photoUrl,
  onPhotoCapture,
}: MealFormProps) => {
  const fileInputRef = useState<HTMLInputElement | null>(null);

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onPhotoCapture(file);
    }
  };

  return (
    <Card className="bg-white shadow-sm border-none">
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-semibold text-gray-900">Nova Refeição</h2>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(date) => date && setDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <Select value={mealType} onValueChange={setMealType}>
            <SelectTrigger className="w-full bg-gray-50 border-gray-200">
              <SelectValue placeholder="Selecione a refeição" />
            </SelectTrigger>
            <SelectContent>
              {mealTypes.map((type) => (
                <SelectItem key={type.id} value={type.name}>
                  {type.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fase do Protocolo
              </label>
              <Select value={phase} onValueChange={setPhase}>
                <SelectTrigger className="w-full bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Selecione a fase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Fase 1 - Remoção e Desintoxicação</SelectItem>
                  <SelectItem value="2">Fase 2 - Reequilíbrio da Microbiota</SelectItem>
                  <SelectItem value="3">Fase 3 - Reparo e Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="hidden"
                ref={(el) => fileInputRef[1](el)}
              />
              
              <Button
                type="button"
                onClick={() => fileInputRef[0]?.click()}
                className="w-full flex items-center justify-center gap-2"
                variant="outline"
              >
                <Camera className="w-5 h-5" />
                Tirar Foto
              </Button>

              {photoUrl && (
                <div className="mt-4">
                  <img 
                    src={photoUrl} 
                    alt="Foto da refeição" 
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={onSubmit}
            disabled={loading || !mealType || !photoUrl}
            className="w-full bg-primary-500 hover:bg-primary-600 text-white"
          >
            {loading ? "Registrando..." : "Registrar Refeição"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
