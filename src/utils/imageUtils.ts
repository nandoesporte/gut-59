
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
  
  // Se já é uma URL completa válida do Supabase, retornar como está
  if (urlString.startsWith('https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/')) {
    console.log(`🔗 Using complete Supabase URL: ${urlString}`);
    return urlString;
  }
  
  // Se é uma URL completa de outro domínio, retornar como está
  if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
    console.log(`🔗 Using complete external URL: ${urlString}`);
    return urlString;
  }
  
  // Se começa com /storage/v1/object/public/, construir a URL completa
  if (urlString.startsWith('/storage/v1/object/public/')) {
    const fullUrl = `https://sxjafhzikftdenqnkcri.supabase.co${urlString}`;
    console.log(`🔗 Built complete URL from storage path: ${fullUrl}`);
    return fullUrl;
  }
  
  // Para URLs que contêm batch/ ou exercise-gifs/, construir corretamente
  if (urlString.includes('batch/') || urlString.includes('exercise-gifs/')) {
    // Se já contém exercise-gifs no caminho
    if (urlString.includes('exercise-gifs/')) {
      // Extrair apenas a parte após exercise-gifs/
      const parts = urlString.split('exercise-gifs/');
      const gifPath = parts[parts.length - 1];
      const fullUrl = `https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/exercise-gifs/${gifPath}`;
      console.log(`🔗 Built URL from exercise-gifs path: ${fullUrl}`);
      return fullUrl;
    }
    
    // Se contém batch/ mas não exercise-gifs/
    if (urlString.includes('batch/')) {
      const batchIndex = urlString.indexOf('batch/');
      const pathFromBatch = urlString.substring(batchIndex);
      const fullUrl = `https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/exercise-gifs/${pathFromBatch}`;
      console.log(`🔗 Built URL for batch path: ${fullUrl}`);
      return fullUrl;
    }
  }
  
  // Verificar se contém um nome de arquivo válido (extensões de imagem)
  const imageExtensions = ['.gif', '.jpg', '.jpeg', '.png', '.webp', '.svg'];
  const hasImageExtension = imageExtensions.some(ext => urlString.toLowerCase().includes(ext));
  
  if (hasImageExtension) {
    // Para outros casos, assumir que é um caminho relativo no bucket exercise-gifs
    const cleanPath = urlString.startsWith('/') ? urlString.substring(1) : urlString;
    const fullUrl = `https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/exercise-gifs/${cleanPath}`;
    console.log(`🔗 Built URL for relative path with image extension: ${fullUrl}`);
    return fullUrl;
  }
  
  // Se não tem extensão de imagem, verificar se é apenas o ID do exercício
  if (urlString.match(/^[0-9a-f-]{36}$/i)) {
    console.log(`🔗 Detected UUID-like string, treating as invalid: ${urlString}`);
    return '/placeholder.svg';
  }
  
  // Como último recurso, tentar construir a URL
  const cleanPath = urlString.startsWith('/') ? urlString.substring(1) : urlString;
  const fullUrl = `https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/exercise-gifs/${cleanPath}`;
  console.log(`🔗 Built URL as last resort: ${fullUrl}`);
  return fullUrl;
};

// Função para testar se uma URL de imagem é válida
export const testImageUrl = async (url: string): Promise<boolean> => {
  try {
    console.log('🔍 Testing URL:', url);
    
    // Primeiro, tentar com HEAD request
    let response = await fetch(url, { 
      method: 'HEAD',
      mode: 'cors',
      cache: 'no-cache'
    });
    
    // Se HEAD falhar, tentar com GET
    if (!response.ok) {
      console.log('🔍 HEAD request failed, trying GET request');
      response = await fetch(url, { 
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache'
      });
    }
    
    const isValid = response.ok;
    console.log(`🔍 URL test result: ${isValid ? 'Valid' : 'Invalid'} (${response.status})`);
    console.log(`🔍 Content-Type: ${response.headers.get('content-type')}`);
    console.log(`🔍 Content-Length: ${response.headers.get('content-length')}`);
    
    return isValid;
  } catch (error) {
    console.error('🔍 Error testing image URL:', error);
    return false;
  }
};

// Função para validar URLs de GIF
export const validateGifUrl = (url: string | null): boolean => {
  if (!url) return false;
  
  const urlString = String(url).trim();
  
  // Verificações básicas
  if (!urlString || urlString.length < 10) return false;
  if (urlString.includes('null') || urlString.includes('undefined')) return false;
  if (urlString.includes('placeholder')) return false;
  
  // Se é apenas um UUID, não é uma URL válida
  if (urlString.match(/^[0-9a-f-]{36}$/i)) {
    console.log(`🔍 Detected UUID-only string, invalid: ${urlString}`);
    return false;
  }
  
  // Deve ser uma URL válida ou conter paths conhecidos ou extensões de imagem
  const imageExtensions = ['.gif', '.jpg', '.jpeg', '.png', '.webp', '.svg'];
  const hasImageExtension = imageExtensions.some(ext => urlString.toLowerCase().includes(ext));
  
  const isValidUrl = urlString.startsWith('http://') || 
                    urlString.startsWith('https://') ||
                    urlString.includes('exercise-gifs') ||
                    urlString.includes('batch') ||
                    urlString.startsWith('/storage/v1/object/public/') ||
                    hasImageExtension;
  
  console.log(`🔍 URL validation for "${urlString}": ${isValidUrl}`);
  return isValidUrl;
};

// Nova função para debug detalhado
export const debugImageUrl = (url: string | null): void => {
  console.group(`🔍 Debug Image URL: ${url}`);
  console.log('Original URL:', url);
  console.log('Type:', typeof url);
  console.log('Length:', url?.length);
  console.log('Is null/undefined:', !url);
  console.log('Validation result:', validateGifUrl(url));
  console.log('Formatted URL:', formatImageUrl(url));
  console.groupEnd();
};
