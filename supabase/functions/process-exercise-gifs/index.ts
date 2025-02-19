
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { JSZip } from 'https://deno.land/x/jszip@0.11.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Iniciando processamento do arquivo ZIP');
    const formData = await req.formData()
    const zipFile = formData.get('file') as File
    const category = formData.get('category') as string

    if (!zipFile || !category) {
      return new Response(
        JSON.stringify({ error: 'Arquivo ZIP e categoria são obrigatórios' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar se o bucket existe, se não existir, criar
    const { data: buckets } = await supabase.storage.listBuckets()
    if (!buckets?.find(b => b.name === 'exercise-gifs')) {
      const { error } = await supabase.storage.createBucket('exercise-gifs', {
        public: true
      })
      if (error) {
        throw new Error(`Erro ao criar bucket: ${error.message}`)
      }
    }

    const arrayBuffer = await zipFile.arrayBuffer()
    const zip = new JSZip()
    await zip.loadAsync(arrayBuffer)
    
    const uploadedFiles = []
    const errors = []
    let processedCount = 0

    // Processar apenas 5 arquivos por vez
    const batchSize = 2 
    const files = Object.entries(zip.files).filter(([_, file]) => !file.dir)
    
    console.log(`Total de arquivos encontrados: ${files.length}`)

    for (let i = 0; i < files.length; i += batchSize) {
      console.log(`Processando lote ${Math.floor(i / batchSize) + 1} de ${Math.ceil(files.length / batchSize)}`);
      
      const batch = files.slice(i, i + batchSize)
      
      // Adicionar delay entre lotes
      if (i > 0) {
        console.log('Aguardando 3 segundos antes do próximo lote...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      for (const [filename, file] of batch) {
        console.log(`Processando arquivo: ${filename}`);
        
        if (!filename.toLowerCase().endsWith('.gif')) {
          console.log(`${filename} ignorado: não é um arquivo GIF`);
          errors.push(`${filename} não é um arquivo GIF`);
          continue;
        }

        try {
          const content = await file.async('blob')
          const sanitizedName = filename.split('/').pop()?.replace(/[^a-zA-Z0-9.-]/g, '_')
          const exerciseName = sanitizedName?.replace('.gif', '').replace(/_/g, ' ')
          
          console.log(`Fazendo upload de ${filename} para a categoria ${category}`);
          
          // Upload do arquivo para o storage
          const filePath = `${category}/${sanitizedName}`
          const { error: uploadError } = await supabase.storage
            .from('exercise-gifs')
            .upload(filePath, content, {
              contentType: 'image/gif',
              upsert: true
            })

          if (uploadError) {
            console.error(`Erro no upload do arquivo ${filename}:`, uploadError);
            throw uploadError;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('exercise-gifs')
            .getPublicUrl(filePath)

          // Criar registro do exercício no banco
          console.log(`Criando registro para exercício: ${exerciseName}`);
          const { data: exerciseData, error: dbError } = await supabase
            .from('exercises')
            .insert({
              name: exerciseName,
              description: `Exercício ${exerciseName}`,
              gif_url: publicUrl,
              muscle_group: category,
              exercise_type: category === 'cardio' ? 'cardio' : 
                           category === 'mobility' ? 'mobility' : 'strength',
              difficulty: 'beginner',
              min_reps: 8,
              max_reps: 12,
              min_sets: 3,
              max_sets: 5,
              rest_time_seconds: 60,
              alternative_exercises: [],
              equipment_needed: []
            })
            .select()
            .single()

          if (dbError) {
            console.error(`Erro ao criar registro para ${filename}:`, dbError);
            throw dbError;
          }

          uploadedFiles.push({ 
            name: filename, 
            url: publicUrl,
            exercise: exerciseData 
          })
          processedCount++
          console.log(`Arquivo ${filename} processado com sucesso`);
          
        } catch (error) {
          console.error(`Erro ao processar ${filename}:`, error);
          errors.push(`Erro ao processar ${filename}: ${error.message}`);
        }
      }
    }

    console.log('Processamento concluído');
    console.log(`Total processado: ${processedCount} arquivos`);
    console.log(`Erros encontrados: ${errors.length}`);

    return new Response(
      JSON.stringify({ 
        message: 'Processamento concluído', 
        uploaded: uploadedFiles,
        errors: errors,
        total: processedCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erro geral:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao processar arquivo ZIP', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
