
/**
 * Formats image URLs to handle placeholders for missing images and example URLs
 */
export const formatImageUrl = (url: string | null | undefined): string => {
  if (!url) {
    return '/placeholder.svg';
  }
  
  // Check if the URL is an example URL or invalid
  if (url.includes('example.com') || url === '') {
    console.warn('Invalid example URL detected:', url);
    console.info('Processing exercise GIF URL:', url, '→ /placeholder.svg');
    return '/placeholder.svg';
  }
  
  // For Supabase storage URLs, make sure they're properly formatted
  if (url.includes('storage.googleapis.com') || url.includes('supabase')) {
    return url;
  }
  
  // For relative URLs, ensure they start with /
  if (!url.startsWith('http') && !url.startsWith('/')) {
    return `/${url}`;
  }
  
  return url;
};
