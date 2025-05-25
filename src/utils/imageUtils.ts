
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
  
  // Se contém apenas o nome do arquivo ou path relativo, construir URL completa
  if (cleanUrl.includes('.gif') || cleanUrl.includes('.jpg') || cleanUrl.includes('.png') || cleanUrl.includes('.webp')) {
    const fullUrl = `https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/exercise-gifs/${cleanUrl}`;
    console.log('✅ formatImageUrl: Built complete URL:', fullUrl);
    return fullUrl;
  }
  
  // Fallback: assume que é um path relativo e adiciona o prefixo completo
  const fallbackUrl = `https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/exercise-gifs/${cleanUrl}`;
  console.log('🔄 formatImageUrl: Fallback URL:', fallbackUrl);
  return fallbackUrl;
};
