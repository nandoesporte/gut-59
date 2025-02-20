
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExerciseFeedbackProps {
  exerciseId: string;
  sessionId: string;
}

export const ExerciseFeedback = ({ exerciseId, sessionId }: ExerciseFeedbackProps) => {
  const [difficulty, setDifficulty] = useState<number>(0);
  const [notes, setNotes] = useState("");

  const saveFeedback = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const { error } = await supabase
        .from('workout_progress')
        .insert({
          exercise_id: exerciseId,
          session_id: sessionId,
          difficulty_rating: difficulty,
          notes,
          user_id: user.id,
        });

      if (error) throw error;

      toast.success("Feedback salvo com sucesso!");
      setNotes("");
    } catch (error) {
      console.error("Erro ao salvar feedback:", error);
      toast.error("Erro ao salvar feedback");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Dificuldade</label>
        <div className="flex gap-2 mt-2">
          {[1, 2, 3, 4, 5].map((rating) => (
            <Button
              key={rating}
              variant={difficulty === rating ? "default" : "outline"}
              onClick={() => setDifficulty(rating)}
              className="w-10 h-10"
            >
              {rating}
            </Button>
          ))}
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium">Anotações</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Adicione suas observações sobre o exercício..."
          className="mt-2"
        />
      </div>

      <Button onClick={saveFeedback} className="w-full">
        Salvar Feedback
      </Button>
    </div>
  );
};
