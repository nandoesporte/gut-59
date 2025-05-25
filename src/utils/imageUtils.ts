
export const formatImageUrl = (url: string | null): string => {
  if (!url) return '/placeholder.svg';
  
  // Remover espaços em branco
  const cleanUrl = url.trim();
  
  // Se é uma URL vazia ou inválida
  if (!cleanUrl || cleanUrl === 'null' || cleanUrl === 'undefined') {
    return '/placeholder.svg';
  }
  
  // Se já é uma URL completa, retornar como está
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    console.log(`🔗 Using complete URL: ${cleanUrl}`);
    return cleanUrl;
  }
  
  // Se é uma URL relativa sem barra inicial, adicionar
  if (!cleanUrl.startsWith('/')) {
    const formattedUrl = `/${cleanUrl}`;
    console.log(`🔗 Added leading slash: ${formattedUrl}`);
    return formattedUrl;
  }
  
  // URL relativa com barra inicial
  console.log(`🔗 Using relative URL: ${cleanUrl}`);
  return cleanUrl;
};
