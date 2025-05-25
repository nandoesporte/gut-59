
export const formatImageUrl = (url: string | null): string => {
  if (!url) return '/placeholder.svg';
  
  // Se já é uma URL completa, retorna como está
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Se é uma URL relativa válida do Supabase storage
  if (url.includes('/storage/v1/object/public/')) {
    return url.startsWith('/') ? url : `/${url}`;
  }
  
  // Se contém apenas o caminho do arquivo
  if (url.includes('exercise-gifs/batch/')) {
    return `https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/${url}`;
  }
  
  // Fallback para placeholder
  return '/placeholder.svg';
};
