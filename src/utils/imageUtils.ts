
export const formatImageUrl = (url: string | null): string => {
  if (!url) {
    console.log('ImageUtils: URL is null/undefined, returning placeholder');
    return '/placeholder.svg';
  }
  
  console.log('ImageUtils: Processing URL:', url);
  
  // Se já é uma URL completa, retorna como está
  if (url.startsWith('http://') || url.startsWith('https://')) {
    console.log('ImageUtils: URL is already complete, returning as-is');
    return url;
  }
  
  // Se é uma URL relativa do Supabase storage que já está completa
  if (url.includes('/storage/v1/object/public/')) {
    const formattedUrl = url.startsWith('/') ? url : `/${url}`;
    console.log('ImageUtils: Formatted relative storage URL:', formattedUrl);
    return formattedUrl;
  }
  
  // Primeiro tenta o bucket exercise-gifs (que parece ser onde estão os arquivos baseado nos logs de rede)
  if (url.includes('.gif')) {
    // Se já tem o caminho completo com batch, usa como está
    if (url.includes('exercise-gifs/batch/')) {
      const fullUrl = `https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/${url}`;
      console.log('ImageUtils: Created full URL for exercise-gifs/batch:', fullUrl);
      return fullUrl;
    }
    
    // Se tem apenas o nome do arquivo com prefixo timestamp, adiciona o caminho batch
    if (url.match(/^\d+_[a-z0-9]+_/)) {
      const fullUrl = `https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/exercise-gifs/batch/${url}`;
      console.log('ImageUtils: Created full URL for batch file with timestamp:', fullUrl);
      return fullUrl;
    }
    
    // Tenta primeiro no bucket exercicios (exemplo funcional que você mostrou)
    const cleanUrl = url.replace(/^(exercise-gifs\/batch\/|exercicios\/)?/, '');
    const exerciciosUrl = `https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/exercicios/${cleanUrl}`;
    console.log('ImageUtils: Created full URL using exercicios bucket:', exerciciosUrl);
    return exerciciosUrl;
  }
  
  // Fallback para placeholder
  console.log('ImageUtils: No matching pattern, returning placeholder for URL:', url);
  return '/placeholder.svg';
};

// Função auxiliar para verificar se o GIF é válido
export const validateGifUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentType = response.headers.get('Content-Type');
    const isValid = response.ok && contentType?.includes('image/gif');
    
    console.log('ImageUtils: URL validation result:', {
      url,
      status: response.status,
      contentType,
      isValid
    });
    
    return isValid;
  } catch (error) {
    console.error('ImageUtils: Error validating URL:', url, error);
    return false;
  }
};
