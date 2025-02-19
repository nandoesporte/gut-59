
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

    // Ler e processar o arquivo ZIP
    const arrayBuffer = await zipFile.arrayBuffer()
    const zip = new JSZip()
    await zip.loadAsync(arrayBuffer)
    
    const uploadedFiles = []
    const errors = []

    // Processar cada arquivo do ZIP
    for (const [filename, file] of Object.entries(zip.files)) {
      if (file.dir) continue // Pular diretórios

      // Verificar se é um GIF
      if (!filename.toLowerCase().endsWith('.gif')) {
        errors.push(`${filename} não é um arquivo GIF`)
        continue
      }

      try {
        const content = await file.async('blob')
        const sanitizedName = filename.split('/').pop()?.replace(/[^a-zA-Z0-9.-]/g, '_')
        const filePath = `${category}/${sanitizedName}`

        // Upload do arquivo para o Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('exercise-gifs-by-category')
          .upload(filePath, content, {
            contentType: 'image/gif',
            upsert: true
          })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('exercise-gifs-by-category')
          .getPublicUrl(filePath)

        // Criar o exercício no banco de dados
        const exerciseName = sanitizedName?.replace('.gif', '').replace(/_/g, ' ')
        const { error: dbError } = await supabase
          .from('exercises')
          .insert({
            name: exerciseName,
            description: `Exercício ${exerciseName}`,
            gif_url: publicUrl,
            muscle_group: category as any,
            exercise_type: category === 'cardio' ? 'cardio' : 
                         category === 'mobility' ? 'mobility' : 'strength',
            difficulty: 'beginner',
            min_reps: 8,
            max_reps: 12,
            min_sets: 3,
            max_sets: 5,
            rest_time_seconds: 60
          })

        if (dbError) throw dbError

        uploadedFiles.push({ name: filename, url: publicUrl })
      } catch (error) {
        errors.push(`Erro ao processar ${filename}: ${error.message}`)
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Processamento concluído', 
        uploaded: uploadedFiles,
        errors: errors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Erro ao processar arquivo ZIP', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
