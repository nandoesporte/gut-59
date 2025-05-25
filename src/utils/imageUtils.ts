
export const formatImageUrl = (url: string | null): string => {
  if (!url) return '/placeholder.svg';
  
  // If it's already a complete URL, return it
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If it's a Supabase storage path, construct the full URL
  if (url.startsWith('/storage/v1/object/public/')) {
    return `https://sxjafhzikftdenqnkcri.supabase.co${url}`;
  }
  
  // If it's a relative URL without leading slash, add it
  if (!url.startsWith('/')) {
    return `/${url}`;
  }
  
  // Otherwise, it's a relative URL with leading slash
  return url;
};
