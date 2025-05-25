
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
  
  // Se é uma URL relativa válida do Supabase storage
  if (url.includes('/storage/v1/object/public/')) {
    const formattedUrl = url.startsWith('/') ? url : `/${url}`;
    console.log('ImageUtils: Formatted relative storage URL:', formattedUrl);
    return formattedUrl;
  }
  
  // Se contém apenas o caminho do arquivo na pasta batch
  if (url.includes('exercise-gifs/batch/')) {
    const fullUrl = `https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/${url}`;
    console.log('ImageUtils: Created full URL for batch file:', fullUrl);
    return fullUrl;
  }
  
  // Se é apenas um nome de arquivo, assumir que está na pasta batch
  if (url.includes('.gif') && !url.includes('/')) {
    const fullUrl = `https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/exercise-gifs/batch/${url}`;
    console.log('ImageUtils: Created full URL for filename only:', fullUrl);
    return fullUrl;
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
