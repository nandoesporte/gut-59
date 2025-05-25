
export const formatImageUrl = (url: string | null): string => {
  if (!url) {
    console.log('ImageUtils: URL is null/undefined, returning placeholder');
    return '/placeholder.svg';
  }
  
  console.log('ImageUtils: Processing URL:', url);
  
  // Se já é uma URL completa do Supabase, retorna como está
  if (url.startsWith('https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/')) {
    console.log('ImageUtils: URL is already complete, returning as-is');
    return url;
  }
  
  // Se é uma URL relativa do Supabase storage que já está completa
  if (url.includes('/storage/v1/object/public/')) {
    const formattedUrl = url.startsWith('/') ? url : `/${url}`;
    console.log('ImageUtils: Formatted relative storage URL:', formattedUrl);
    return formattedUrl;
  }
  
  // Para arquivos GIF, construir URL correta baseada no bucket
  if (url.includes('.gif')) {
    let finalUrl: string;
    
    // Se a URL já contém o caminho do bucket exercise-gifs/batch
    if (url.includes('exercise-gifs/batch/')) {
      // Usar como está, apenas adicionar o domínio se necessário
      if (url.startsWith('exercise-gifs/batch/')) {
        finalUrl = `https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/${url}`;
      } else {
        finalUrl = url;
      }
    }
    // Se a URL contém apenas o nome do arquivo ou um caminho parcial
    else {
      // Remover qualquer prefixo desnecessário e construir o caminho correto
      const fileName = url.replace(/^(exercise-gifs\/batch\/|exercicios\/|batch\/)?/, '');
      
      // Construir URL completa para o bucket exercise-gifs/batch
      finalUrl = `https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/exercise-gifs/batch/${fileName}`;
    }
    
    console.log('ImageUtils: Created URL for exercise-gifs/batch bucket:', finalUrl);
    return finalUrl;
  }
  
  // Fallback para placeholder
  console.log('ImageUtils: No matching pattern, returning placeholder for URL:', url);
  return '/placeholder.svg';
};

// Função auxiliar para verificar se o GIF é válido
export const validateGifUrl = async (url: string): Promise<boolean> => {
  try {
    console.log('ImageUtils: Validating URL:', url);
    const response = await fetch(url, { method: 'HEAD' });
    const contentType = response.headers.get('Content-Type');
    const isValid = response.ok && (contentType?.includes('image/gif') || contentType?.includes('image/'));
    
    console.log('ImageUtils: URL validation result:', {
      url,
      status: response.status,
      statusText: response.statusText,
      contentType,
      isValid
    });
    
    return isValid;
  } catch (error) {
    console.error('ImageUtils: Error validating URL:', url, error);
    return false;
  }
};
