
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
  
  // Se o caminho contém 'exercise-gifs' mas não começa com storage path
  if (urlString.includes('exercise-gifs')) {
    // Extrair apenas a parte relevante do caminho
    let cleanPath = urlString;
    
    // Se já contém o bucket path, usar como está
    if (urlString.includes('exercise-gifs/')) {
      const bucketIndex = urlString.indexOf('exercise-gifs/');
      cleanPath = urlString.substring(bucketIndex);
    }
    
    const fullUrl = `https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/${cleanPath}`;
    console.log(`🔗 Built URL for exercise-gifs path: ${fullUrl}`);
    return fullUrl;
  }
  
  // Para URLs que podem ser apenas o nome do arquivo ou caminho relativo
  if (!urlString.startsWith('/')) {
    const fullUrl = `https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/exercise-gifs/${urlString}`;
    console.log(`🔗 Built URL for relative path: ${fullUrl}`);
    return fullUrl;
  }
  
  // Para outros casos, tentar construir a URL assumindo que é um caminho absoluto
  const fullUrl = `https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public${urlString.startsWith('/') ? urlString : '/' + urlString}`;
  console.log(`🔗 Built URL for absolute path: ${fullUrl}`);
  return fullUrl;
};
