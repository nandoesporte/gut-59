
export const formatImageUrl = (url: string | null | undefined): string => {
  if (!url) {
    console.log('⚠️ formatImageUrl: URL is null or undefined');
    return '';
  }

  const cleanUrl = url.trim();
  
  console.log('🔧 formatImageUrl input:', cleanUrl);
  
  // Se já é uma URL completa, retorna como está
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    console.log('✅ formatImageUrl: URL already complete:', cleanUrl);
    return cleanUrl;
  }
  
  // Se começa com /storage, já está no formato correto do Supabase
  if (cleanUrl.startsWith('/storage/v1/object/public/')) {
    const fullUrl = `https://sxjafhzikftdenqnkcri.supabase.co${cleanUrl}`;
    console.log('✅ formatImageUrl: Formatted Supabase URL:', fullUrl);
    return fullUrl;
  }
  
  // Se não tem o prefixo /storage, adiciona
  if (cleanUrl.startsWith('exercise-gifs/') || cleanUrl.includes('exercise-gifs/')) {
    const fullUrl = `https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/${cleanUrl}`;
    console.log('✅ formatImageUrl: Added storage prefix:', fullUrl);
    return fullUrl;
  }
  
  // Fallback: assume que é um path relativo e adiciona o prefixo completo
  const fallbackUrl = `https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/exercise-gifs/${cleanUrl}`;
  console.log('🔄 formatImageUrl: Fallback URL:', fallbackUrl);
  return fallbackUrl;
};
