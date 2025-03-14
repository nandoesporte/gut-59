
import { SUPABASE_URL } from '@/integrations/supabase/client';

/**
 * Formata uma URL de imagem para garantir que seja exibida corretamente
 * Lida com diferentes formatos de URL (URLs de armazenamento Supabase, URLs completas, etc.)
 * 
 * @param url A URL original da imagem
 * @returns URL formatada pronta para ser usada em img src
 */
export const formatImageUrl = (url: string | null | undefined): string => {
  if (!url) {
    console.log("URL vazia, usando placeholder");
    return '/placeholder.svg';
  }

  // Limpa a URL removendo qualquer espaço em branco
  const cleanUrl = url.trim();

  // Se a URL estiver vazia após a remoção de espaços, retorne o placeholder
  if (!cleanUrl) {
    console.log("URL vazia, usando placeholder");
    return '/placeholder.svg';
  }

  // Lidar com URLs com placeholders inválidos ou URLs de teste
  if (cleanUrl === 'example.com' || 
      cleanUrl.includes('example.com') || 
      cleanUrl === 'example.gif' ||
      cleanUrl === 'placeholder.gif' ||
      cleanUrl.includes('undefined') ||
      cleanUrl.includes('null') ||
      cleanUrl.length < 10 ||
      /^[0-9a-f]{32}$/.test(cleanUrl) || // Provavelmente um hash MD5 ou similar sem extensão
      cleanUrl.includes('.gif.gif')) {  // Extensões duplicadas
    console.log(`URL inválida detectada: ${cleanUrl}`);
    return '/placeholder.svg';
  }

  // Se a URL já é uma URL HTTP(S) válida
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    // Mas verifique se é uma URL de placeholder
    if (cleanUrl.includes('example.com') || cleanUrl.includes('example.org')) {
      return '/placeholder.svg';
    }
    
    // Verificar se é URL Supabase Storage
    if (cleanUrl.includes('supabase.co/storage/v1/object/public')) {
      console.log(`URL Supabase detectada e será usada: ${cleanUrl}`);
      return cleanUrl;
    }
    
    return cleanUrl;
  }

  // Lidar com URLs que começam com "storage/v1/" mas não incluem o domínio supabase
  if (cleanUrl.startsWith('storage/v1/')) {
    console.log(`Adicionando prefixo Supabase à URL: ${cleanUrl}`);
    return `${SUPABASE_URL}/${cleanUrl}`;
  }

  // Para URLs relativas começando com "/"
  if (cleanUrl.startsWith('/')) {
    // Verifique se já está prefixado com o caminho público
    if (cleanUrl.startsWith('/public/')) {
      return cleanUrl;
    }
    return cleanUrl;
  }

  // Para outras URLs, assuma que podem ser do armazenamento Supabase
  // e adicione o URL do Supabase se parecerem com caminhos de armazenamento parcial
  if (cleanUrl.includes('batch/') || 
      cleanUrl.includes('exercise-gifs/') || 
      cleanUrl.includes('exercises/')) {
    console.log(`Adicionando prefixo Supabase para caminho de armazenamento: ${cleanUrl}`);
    return `${SUPABASE_URL}/storage/v1/object/public/${cleanUrl}`;
  }

  // Se a URL não tiver uma extensão que indique uma imagem, verifique mais detalhadamente
  const hasImageExtension = /\.(gif|jpe?g|png|svg|webp)$/i.test(cleanUrl);
  if (!hasImageExtension) {
    // Verifique se pode ser uma URL de armazenamento Supabase sem extensão
    if (cleanUrl.includes('storage') || cleanUrl.includes('object/public')) {
      console.log(`URL de armazenamento sem extensão: ${cleanUrl}`);
      return cleanUrl;
    }
    
    // Tente identificar URLs que podem precisar de https:// prefixado
    if (cleanUrl.includes('supabase.co') && !cleanUrl.startsWith('http')) {
      console.log(`Adicionando https:// à URL: ${cleanUrl}`);
      return `https://${cleanUrl}`;
    }
    
    console.log(`URL sem extensão de imagem: ${cleanUrl}, usando placeholder`);
    return '/placeholder.svg';
  }

  // Log para depuração
  console.log(`URL não modificada: ${cleanUrl}`);
  
  // Retorne como está para qualquer outro caso
  return cleanUrl;
};
