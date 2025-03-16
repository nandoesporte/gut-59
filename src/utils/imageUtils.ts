export const formatImageUrl = (url: string | null): string => {
  if (!url) return '/placeholder.svg';
  
  // If it's already a complete URL, return it
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If it's a relative URL without leading slash, add it
  if (!url.startsWith('/')) {
    return `/${url}`;
  }
  
  // Otherwise, it's a relative URL with leading slash
  return url;
};
