
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ExerciseForm } from './ExerciseForm';
import { BatchUploadForm } from './BatchUploadForm';
import { ExerciseCard } from './ExerciseCard';

export const ExerciseList = () => {
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBatchUpload, setShowBatchUpload] = useState(false);

  const fetchExercises = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExercises(data || []);
    } catch (error) {
      console.error('Error fetching exercises:', error);
      toast.error('Erro ao carregar exercícios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  const handleAddSuccess = () => {
    setShowAddForm(false);
    fetchExercises();
    toast.success('Exercício adicionado com sucesso!');
  };

  const handleBatchUploadSuccess = () => {
    setShowBatchUpload(false);
    fetchExercises();
    toast.success('Exercícios importados com sucesso!');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gerenciar Exercícios</h2>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddForm(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Exercício
          </Button>
          <Button onClick={() => setShowBatchUpload(true)} variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Importar Exercícios
          </Button>
        </div>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Novo Exercício</CardTitle>
          </CardHeader>
          <CardContent>
            <ExerciseForm onSuccess={handleAddSuccess} onCancel={() => setShowAddForm(false)} />
          </CardContent>
        </Card>
      )}

      {showBatchUpload && (
        <Card>
          <CardHeader>
            <CardTitle>Importar Exercícios</CardTitle>
          </CardHeader>
          <CardContent>
            <BatchUploadForm onSuccess={handleBatchUploadSuccess} onCancel={() => setShowBatchUpload(false)} />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {exercises.map(exercise => (
          <ExerciseCard 
            key={exercise.id}
            exercise={exercise}
            onUpdate={fetchExercises}
          />
        ))}
      </div>

      {loading && <p>Carregando exercícios...</p>}
      {!loading && exercises.length === 0 && (
        <p className="text-center text-muted-foreground">
          Nenhum exercício cadastrado ainda.
        </p>
      )}
    </div>
  );
};
