
export const formatImageUrl = (url: string | null): string => {
  console.log('🔗 formatImageUrl called with:', url, 'Type:', typeof url);
  
  if (!url) {
    console.log('🔗 No URL provided, using placeholder');
    return '/placeholder.svg';
  }
  
  // Converter para string se necessário
  const urlString = String(url).trim();
  
  // Se é uma URL vazia ou inválida
  if (!urlString || urlString === 'null' || urlString === 'undefined' || urlString.length < 5) {
    console.log('🔗 Invalid URL, using placeholder:', urlString);
    return '/placeholder.svg';
  }
  
  // Se já é uma URL completa do Supabase, retornar como está
  if (urlString.startsWith('https://sxjafhzikftdenqnkcri.supabase.co/')) {
    console.log(`🔗 Using complete Supabase URL: ${urlString}`);
    return urlString;
  }
  
  // Se é uma URL completa de outro domínio, retornar como está
  if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
    console.log(`🔗 Using complete external URL: ${urlString}`);
    return urlString;
  }
  
  // Se é um caminho que já começa com /storage/v1/object/public/, construir a URL completa
  if (urlString.startsWith('/storage/v1/object/public/')) {
    const fullUrl = `https://sxjafhzikftdenqnkcri.supabase.co${urlString}`;
    console.log(`🔗 Built complete URL from storage path: ${fullUrl}`);
    return fullUrl;
  }
  
  // Se é apenas o nome do arquivo ou caminho relativo, construir a URL completa
  if (!urlString.startsWith('/')) {
    const fullUrl = `https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/exercise-gifs/${urlString}`;
    console.log(`🔗 Built URL for relative path: ${fullUrl}`);
    return fullUrl;
  }
  
  // Para outros casos, tentar construir a URL
  const fullUrl = `https://sxjafhzikftdenqnkcri.supabase.co${urlString}`;
  console.log(`🔗 Built URL for absolute path: ${fullUrl}`);
  return fullUrl;
};
