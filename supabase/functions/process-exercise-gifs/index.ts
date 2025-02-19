
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
      console.error('Arquivo ZIP ou categoria não fornecidos');
      return new Response(
        JSON.stringify({ error: 'Arquivo ZIP e categoria são obrigatórios' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Arquivo recebido: ${zipFile.name}, Categoria: ${category}`);
    console.log(`Tamanho do arquivo: ${zipFile.size} bytes`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Carregando arquivo ZIP...');
    const arrayBuffer = await zipFile.arrayBuffer()
    const zip = new JSZip()
    await zip.loadAsync(arrayBuffer)
    
    const uploadedFiles = []
    const errors = []
    let processedCount = 0

    // Obter lista de arquivos do ZIP
    const files = Object.values(zip.files).filter(file => !file.dir)
    console.log(`Total de arquivos no ZIP: ${files.length}`);

    for (const file of files) {
      const filename = file.name
      console.log(`\nProcessando arquivo: ${filename}`);
        
      if (!filename.toLowerCase().endsWith('.gif')) {
        console.log(`${filename} ignorado: não é um arquivo GIF`);
        errors.push(`${filename} não é um arquivo GIF`);
        continue;
      }

      try {
        console.log('Convertendo arquivo para Blob...');
        const content = await file.async('blob')
        const sanitizedName = filename.split('/').pop()?.replace(/[^a-zA-Z0-9.-]/g, '_')
        const exerciseName = sanitizedName?.replace('.gif', '').replace(/_/g, ' ')
        
        if (!sanitizedName || !exerciseName) {
          throw new Error('Nome do arquivo inválido');
        }
        
        const filePath = `${category}/${sanitizedName}`
        console.log(`Iniciando upload para ${filePath}`);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('exercise-gifs')
          .upload(filePath, content, {
            contentType: 'image/gif',
            upsert: true
          })

        if (uploadError) {
          console.error('Erro no upload:', uploadError);
          throw uploadError;
        }

        console.log('Upload concluído, gerando URL pública');
        const { data: { publicUrl } } = supabase.storage
          .from('exercise-gifs')
          .getPublicUrl(filePath)

        console.log('Criando registro do exercício...');
        const exerciseData = {
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
        }

        const { data: insertedExercise, error: dbError } = await supabase
          .from('exercises')
          .insert(exerciseData)
          .select()
          .single()

        if (dbError) {
          console.error('Erro ao salvar exercício:', dbError);
          throw dbError;
        }

        console.log(`Exercício ${exerciseName} salvo com sucesso!`);
        uploadedFiles.push({ 
          name: filename, 
          url: publicUrl,
          exercise: insertedExercise
        })
        processedCount++
        
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Erro ao processar ${filename}:`, error);
        errors.push(`Erro ao processar ${filename}: ${error.message}`);
      }
    }

    console.log('\nResumo do processamento:');
    console.log(`Total de arquivos processados: ${processedCount}`);
    console.log(`Total de erros: ${errors.length}`);

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
    console.error('Erro geral no processamento:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao processar arquivo ZIP', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
