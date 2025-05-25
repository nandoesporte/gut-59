
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
  
  // Formato padrão para o bucket exercicios (baseado no seu exemplo funcional)
  if (url.includes('.gif')) {
    // Remove qualquer pasta inicial se presente
    const cleanUrl = url.replace(/^(exercise-gifs\/batch\/|exercicios\/)?/, '');
    const fullUrl = `https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/exercicios/${cleanUrl}`;
    console.log('ImageUtils: Created full URL using exercicios bucket:', fullUrl);
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
