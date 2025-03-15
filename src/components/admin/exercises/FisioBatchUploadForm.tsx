
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PhysioExercise, PhysioJointArea, PhysioCondition } from "./types";

interface FisioBatchUploadFormProps {
  onUpload: (exerciseData: PhysioExercise, file: File) => Promise<void>;
  uploading: boolean;
}

export const FisioBatchUploadForm = ({ onUpload, uploading }: FisioBatchUploadFormProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [jointArea, setJointArea] = useState<PhysioJointArea>("knee");
  const [condition, setCondition] = useState<PhysioCondition>("patellofemoral");
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [processingResults, setProcessingResults] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleIndividualUpload = async () => {
    if (!file) {
      toast.error("Por favor, selecione um arquivo");
      return;
    }

    const exerciseData: PhysioExercise = {
      name: file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
      joint_area: jointArea,
      condition: condition,
      exercise_type: "strength",
      difficulty: "beginner",
    };

    try {
      await onUpload(exerciseData, file);
      toast.success("Exercício enviado com sucesso!");
      setFile(null);
    } catch (error: any) {
      toast.error(`Erro ao enviar exercício: ${error.message}`);
    }
  };

  const handleBatchUpload = async () => {
    if (!file) {
      toast.error("Por favor, selecione um arquivo ZIP");
      return;
    }

    if (!file.name.endsWith('.zip')) {
      toast.error("Por favor, selecione um arquivo ZIP");
      return;
    }

    setUploading(true);
    setProcessingStatus("Enviando arquivo...");

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', jointArea);
      formData.append('targetTable', 'physio_exercises'); // Add the targetTable parameter

      const { data: functionData, error: functionError } = await supabase.functions.invoke('process-exercise-gifs', {
        body: formData,
      });

      if (functionError) {
        throw functionError;
      }

      setProcessingResults(functionData);
      setProcessingStatus(`Processamento concluído! ${functionData.total} exercícios importados.`);
      toast.success(`Processamento concluído! ${functionData.total} exercícios importados.`);
    } catch (error: any) {
      console.error("Erro ao processar arquivo:", error);
      setProcessingStatus(`Erro: ${error.message}`);
      toast.error(`Erro ao processar arquivo: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 bg-white rounded-lg shadow">
      <div>
        <h2 className="text-xl font-semibold mb-4">Upload de Exercícios de Fisioterapia</h2>
        <p className="text-sm text-gray-500 mb-4">
          Faça upload de GIFs ou vídeos (MP4, MOV, WEBM) para exercícios de fisioterapia. 
          Você pode fazer upload individual ou em lote usando um arquivo ZIP.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="jointArea">Área Articular</Label>
          <Select value={jointArea} onValueChange={(value: PhysioJointArea) => setJointArea(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a área articular" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ankle_foot">Tornozelo / Pé</SelectItem>
              <SelectItem value="leg">Perna</SelectItem>
              <SelectItem value="knee">Joelho</SelectItem>
              <SelectItem value="hip">Quadril</SelectItem>
              <SelectItem value="spine">Coluna</SelectItem>
              <SelectItem value="shoulder">Ombro</SelectItem>
              <SelectItem value="elbow_hand">Cotovelo / Mão</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="condition">Condição</Label>
          <Select value={condition} onValueChange={(value: PhysioCondition) => setCondition(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a condição" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="plantar_fasciitis">Fascite Plantar</SelectItem>
              <SelectItem value="calcaneal_spur">Esporão de Calcâneo</SelectItem>
              <SelectItem value="ankle_sprain">Entorse de Tornozelo</SelectItem>
              <SelectItem value="anterior_compartment">Síndrome do Compartimento Anterior</SelectItem>
              <SelectItem value="shin_splints">Canelite</SelectItem>
              <SelectItem value="achilles_tendinitis">Tendinite de Aquiles</SelectItem>
              <SelectItem value="patellofemoral">Síndrome Patelofemoral</SelectItem>
              <SelectItem value="patellar_tendinitis">Tendinite Patelar</SelectItem>
              <SelectItem value="acl_postop">Pós-operatório de LCA</SelectItem>
              <SelectItem value="mcl_injury">Lesão de LCM</SelectItem>
              <SelectItem value="meniscus_injury">Lesão de Menisco</SelectItem>
              <SelectItem value="knee_arthrosis">Artrose de Joelho</SelectItem>
              <SelectItem value="trochanteric_bursitis">Bursite Trocantérica</SelectItem>
              <SelectItem value="piriformis_syndrome">Síndrome do Piriforme</SelectItem>
              <SelectItem value="sports_hernia">Pubalgia</SelectItem>
              <SelectItem value="it_band_syndrome">Síndrome da Banda Iliotibial</SelectItem>
              <SelectItem value="disc_protrusion">Protrusão Discal</SelectItem>
              <SelectItem value="herniated_disc">Hérnia de Disco</SelectItem>
              <SelectItem value="cervical_lordosis">Lordose Cervical</SelectItem>
              <SelectItem value="frozen_shoulder">Ombro Congelado</SelectItem>
              <SelectItem value="shoulder_bursitis">Bursite de Ombro</SelectItem>
              <SelectItem value="rotator_cuff">Manguito Rotador</SelectItem>
              <SelectItem value="impingement">Síndrome do Impacto</SelectItem>
              <SelectItem value="medial_epicondylitis">Epicondilite Medial</SelectItem>
              <SelectItem value="lateral_epicondylitis">Epicondilite Lateral</SelectItem>
              <SelectItem value="carpal_tunnel">Síndrome do Túnel do Carpo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="file">Arquivo (GIF, MP4, MOV, WEBM ou ZIP para upload em lote)</Label>
        <Input id="file" type="file" accept=".gif,.mp4,.mov,.webm,.zip" onChange={handleFileChange} />
      </div>

      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
        <Button onClick={handleIndividualUpload} disabled={uploading || !file || file.name.endsWith('.zip')}>
          Upload Individual
        </Button>
        <Button onClick={handleBatchUpload} disabled={uploading || !file || !file.name.endsWith('.zip')}>
          Upload em Lote
        </Button>
      </div>

      {processingStatus && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <p className="font-medium">{processingStatus}</p>
          
          {processingResults && processingResults.uploaded && processingResults.uploaded.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-gray-600">Arquivos processados: {processingResults.uploaded.length}</p>
              <p className="text-sm text-gray-600">Erros: {processingResults.errors?.length || 0}</p>
            </div>
          )}
          
          {processingResults && processingResults.errors && processingResults.errors.length > 0 && (
            <div className="mt-2">
              <p className="font-medium text-red-500">Erros:</p>
              <ul className="text-sm text-red-500 list-disc list-inside">
                {processingResults.errors.map((error: string, index: number) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
