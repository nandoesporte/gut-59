
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    console.log(`Conectando ao Supabase: ${supabaseUrl}`);
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Carregando arquivo ZIP...');
    const arrayBuffer = await zipFile.arrayBuffer()
    const zip = new JSZip()
    await zip.loadAsync(arrayBuffer)
    
    const uploadedFiles = []
    const errors = []
    let processedCount = 0

    // Obter uma lista de promessas para processar todos os arquivos
    const filePromises = []

    // Primeiro, vamos listar todos os arquivos
    for (const filename of Object.keys(zip.files)) {
      const file = zip.files[filename]
      
      console.log(`Verificando arquivo: ${filename}`);
      
      if (file.dir) {
        console.log(`${filename} é um diretório, ignorando...`);
        continue;
      }

      // Check for valid file types - now supports videos as well
      const isValidFile = filename.toLowerCase().endsWith('.gif') || 
                          filename.toLowerCase().endsWith('.mp4') || 
                          filename.toLowerCase().endsWith('.mov') || 
                          filename.toLowerCase().endsWith('.webm');
      
      if (!isValidFile) {
        console.log(`${filename} não é um arquivo válido (GIF/MP4/MOV/WEBM), ignorando...`);
        errors.push(`${filename} não é um arquivo suportado. Formatos aceitos: GIF, MP4, MOV, WEBM`);
        continue;
      }

      // Determine if it's a video or a GIF
      const isVideo = !filename.toLowerCase().endsWith('.gif');
      
      // Add to processing queue
      filePromises.push(async () => {
        try {
          console.log(`Processando ${filename}...`);
          const content = await file.async('blob')
          const sanitizedName = filename.split('/').pop()?.replace(/[^a-zA-Z0-9.-]/g, '_')
          const exerciseName = sanitizedName?.replace(/\.(gif|mp4|mov|webm)$/i, '').replace(/_/g, ' ')

          if (!sanitizedName || !exerciseName) {
            throw new Error('Nome do arquivo inválido');
          }

          // Use timestamp + random string for unique filenames to avoid caching issues
          const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          // Put videos in a separate folder
          const folderPath = isVideo ? `${category}/videos` : category;
          const filePath = `${folderPath}/${uniqueId}_${sanitizedName}`
          
          console.log(`Enviando para caminho: ${filePath}`);
          
          // Upload file with appropriate content type
          let contentType = 'image/gif';
          if (filename.toLowerCase().endsWith('.mp4')) {
            contentType = 'video/mp4';
          } else if (filename.toLowerCase().endsWith('.mov')) {
            contentType = 'video/quicktime';
          } else if (filename.toLowerCase().endsWith('.webm')) {
            contentType = 'video/webm';
          }
          
          // Upload the file
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('exercise-gifs')
            .upload(filePath, content, {
              contentType: contentType,
              cacheControl: 'no-cache, max-age=0',
              upsert: true
            })

          if (uploadError) {
            console.error(`Erro no upload: ${uploadError.message}`);
            throw uploadError;
          }

          console.log(`Upload bem sucedido para: ${filePath}`);
          
          // Generate absolute URL with proper structure
          const { data: { publicUrl } } = supabase.storage
            .from('exercise-gifs')
            .getPublicUrl(filePath)

          console.log(`URL pública gerada: ${publicUrl}`);

          // Criar registro do exercício
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
            equipment_needed: [],
            primary_muscles_worked: [category],
            is_video: isVideo
          }

          console.log(`Inserindo exercício no banco de dados: ${exerciseName}`);
          
          const { data: insertedExercise, error: dbError } = await supabase
            .from('exercises')
            .insert(exerciseData)
            .select()
            .single()

          if (dbError) {
            console.error(`Erro ao inserir no banco: ${dbError.message}`);
            throw dbError;
          }

          console.log(`Exercício ${exerciseName} processado com sucesso`);
          processedCount++;
          uploadedFiles.push({
            name: filename,
            url: publicUrl,
            is_video: isVideo,
            exercise: insertedExercise
          });

        } catch (error) {
          console.error(`Erro processando ${filename}:`, error);
          errors.push(`Erro ao processar ${filename}: ${error.message}`);
        }
      });
    }

    // Processar arquivos sequencialmente para evitar sobrecarga
    for (const processFile of filePromises) {
      await processFile();
      // Pequena pausa entre processamentos
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\nResumo do processamento:');
    console.log(`Total de arquivos encontrados: ${filePromises.length}`);
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
