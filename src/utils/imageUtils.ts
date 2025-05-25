
export const formatImageUrl = (url: string | null): string => {
  if (!url) {
    console.log('🔗 No URL provided, using placeholder');
    return '/placeholder.svg';
  }
  
  // Remover espaços em branco
  const cleanUrl = url.trim();
  
  // Se é uma URL vazia ou inválida
  if (!cleanUrl || cleanUrl === 'null' || cleanUrl === 'undefined') {
    console.log('🔗 Invalid URL, using placeholder:', cleanUrl);
    return '/placeholder.svg';
  }
  
  // Se já é uma URL completa do Supabase, retornar como está
  if (cleanUrl.startsWith('https://sxjafhzikftdenqnkcri.supabase.co/')) {
    console.log(`🔗 Using complete Supabase URL: ${cleanUrl}`);
    return cleanUrl;
  }
  
  // Se é uma URL completa de outro domínio, retornar como está
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    console.log(`🔗 Using complete external URL: ${cleanUrl}`);
    return cleanUrl;
  }
  
  // Se é um caminho que já começa com /storage/v1/object/public/, construir a URL completa
  if (cleanUrl.startsWith('/storage/v1/object/public/')) {
    const fullUrl = `https://sxjafhzikftdenqnkcri.supabase.co${cleanUrl}`;
    console.log(`🔗 Built complete URL from storage path: ${fullUrl}`);
    return fullUrl;
  }
  
  // Se é apenas o nome do arquivo ou caminho relativo, construir a URL completa
  if (!cleanUrl.startsWith('/')) {
    const fullUrl = `https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/exercise-gifs/${cleanUrl}`;
    console.log(`🔗 Built URL for relative path: ${fullUrl}`);
    return fullUrl;
  }
  
  // Para outros casos, tentar construir a URL
  const fullUrl = `https://sxjafhzikftdenqnkcri.supabase.co${cleanUrl}`;
  console.log(`🔗 Built URL for absolute path: ${fullUrl}`);
  return fullUrl;
};
