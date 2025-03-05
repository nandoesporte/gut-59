
/**
 * Formats an image URL to ensure it's properly displayed
 */
export const formatImageUrl = (url?: string): string => {
  if (!url) return "/placeholder.svg";
  
  // Check for invalid example URLs
  if (url.includes('example.com')) {
    console.warn('Invalid example URL detected:', url);
    return "/placeholder.svg";
  }
  
  // Handle supabase storage URLs
  if (url.includes('supabase.co/storage/v1/object/public')) {
    return url;
  }
  
  // Handle relative URLs
  if (url.startsWith('/') && !url.startsWith('//')) {
    return `${window.location.origin}${url}`;
  }
  
  // Handle protocol-relative URLs
  if (url.startsWith('//')) {
    return `https:${url}`;
  }
  
  // Add protocol if missing
  if (!url.startsWith('http') && !url.startsWith('//') && !url.startsWith('/')) {
    return `https://${url}`;
  }
  
  return url;
};
