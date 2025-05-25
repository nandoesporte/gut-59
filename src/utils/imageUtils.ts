
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
  
  // Se contém 'exercise-gifs' ou 'batch', construir a URL correta
  if (urlString.includes('exercise-gifs') || urlString.includes('batch')) {
    let cleanPath = urlString;
    
    // Remover prefixos desnecessários
    if (cleanPath.startsWith('/')) {
      cleanPath = cleanPath.substring(1);
    }
    
    // Se já contém o caminho do bucket, usar como está
    if (cleanPath.startsWith('exercise-gifs/')) {
      const fullUrl = `https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/${cleanPath}`;
      console.log(`🔗 Built URL for exercise-gifs path: ${fullUrl}`);
      return fullUrl;
    }
    
    // Se contém 'batch' mas não está no formato correto
    if (cleanPath.includes('batch/')) {
      const batchIndex = cleanPath.indexOf('batch/');
      const pathFromBatch = cleanPath.substring(batchIndex);
      const fullUrl = `https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/exercise-gifs/${pathFromBatch}`;
      console.log(`🔗 Built URL for batch path: ${fullUrl}`);
      return fullUrl;
    }
    
    // Para outros casos com exercise-gifs
    const fullUrl = `https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/exercise-gifs/${cleanPath}`;
    console.log(`🔗 Built URL for general exercise-gifs path: ${fullUrl}`);
    return fullUrl;
  }
  
  // Para URLs que podem ser apenas o nome do arquivo ou caminho relativo
  if (!urlString.startsWith('/')) {
    const fullUrl = `https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/exercise-gifs/${urlString}`;
    console.log(`🔗 Built URL for relative path: ${fullUrl}`);
    return fullUrl;
  }
  
  // Para outros casos, tentar construir a URL assumindo que é um caminho no bucket exercise-gifs
  const cleanPath = urlString.startsWith('/') ? urlString.substring(1) : urlString;
  const fullUrl = `https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/exercise-gifs/${cleanPath}`;
  console.log(`🔗 Built URL for fallback path: ${fullUrl}`);
  return fullUrl;
};

// Função para testar se uma URL de imagem é válida
export const testImageUrl = async (url: string): Promise<boolean> => {
  try {
    console.log('🔍 Testing URL:', url);
    const response = await fetch(url, { 
      method: 'HEAD',
      mode: 'cors',
      headers: {
        'Accept': 'image/*'
      }
    });
    const isValid = response.ok;
    console.log(`🔍 URL test result: ${isValid ? 'Valid' : 'Invalid'} (${response.status})`);
    return isValid;
  } catch (error) {
    console.error('🔍 Error testing image URL:', error);
    return false;
  }
};

// Função para validar URLs de GIF com critérios mais rigorosos
export const validateGifUrl = (url: string | null): boolean => {
  if (!url) return false;
  
  const urlString = String(url).trim();
  
  // Verificações básicas
  if (!urlString || urlString.length < 10) return false;
  if (urlString.includes('null') || urlString.includes('undefined')) return false;
  if (urlString.includes('placeholder')) return false;
  
  // Deve ser uma URL válida ou conter paths conhecidos
  const isValidUrl = urlString.startsWith('http://') || 
                    urlString.startsWith('https://') ||
                    urlString.includes('exercise-gifs') ||
                    urlString.includes('batch') ||
                    urlString.startsWith('/storage/v1/object/public/');
  
  console.log(`🔍 URL validation for "${urlString}": ${isValidUrl}`);
  return isValidUrl;
};

// Nova função para debug de URLs
export const debugImageUrl = (originalUrl: string | null, exerciseName: string) => {
  console.log(`🐛 DEBUG - Exercise: ${exerciseName}`);
  console.log(`🐛 Original URL from DB: "${originalUrl}"`);
  console.log(`🐛 URL type: ${typeof originalUrl}`);
  console.log(`🐛 URL length: ${originalUrl?.length || 0}`);
  
  const formatted = formatImageUrl(originalUrl);
  console.log(`🐛 Formatted URL: "${formatted}"`);
  
  const isValid = validateGifUrl(originalUrl);
  console.log(`🐛 Is valid: ${isValid}`);
  
  return { original: originalUrl, formatted, isValid };
};
