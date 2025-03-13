
/**
 * Formats an image URL to ensure it's properly displayed
 * Handles different URL formats (Supabase storage URLs, full URLs, etc.)
 * 
 * @param url The original image URL
 * @returns Formatted URL ready to be used in img src
 */
export const formatImageUrl = (url: string | null | undefined): string => {
  if (!url) {
    return '/placeholder.svg';
  }

  // Clean the URL by removing any whitespace
  const cleanUrl = url.trim();

  // If URL is empty after trimming, return placeholder
  if (!cleanUrl) {
    return '/placeholder.svg';
  }

  // Handle URLs with invalid placeholders or test URLs
  if (cleanUrl === 'example.com' || 
      cleanUrl.includes('example.com') || 
      cleanUrl === 'example.gif' ||
      cleanUrl === 'placeholder.gif' ||
      cleanUrl.includes('undefined') ||
      cleanUrl.includes('null') ||
      cleanUrl.length < 10 ||
      /^[0-9a-f]{32}$/.test(cleanUrl) || // Likely an MD5 hash or similar with no extension
      cleanUrl.includes('.gif.gif')) {  // Duplicate extensions
    return '/placeholder.svg';
  }

  // Handle Supabase storage URLs - ensure they're properly formatted
  if (cleanUrl.includes('storage.googleapis.com') || 
      cleanUrl.includes('storage/v1/object/public') || 
      cleanUrl.includes('supabase')) {
    // If it's already a full URL, return it as is
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      return cleanUrl;
    }
    
    // For Supabase storage paths without protocol, ensure they have the correct format
    if (cleanUrl.startsWith('/storage/v1/')) {
      // Get base URL from window.location if in browser
      const baseUrl = typeof window !== 'undefined' 
        ? `${window.location.protocol}//${window.location.host}`
        : '';
      return `${baseUrl}${cleanUrl}`;
    }
    
    return cleanUrl;
  }

  // If URL doesn't have an extension/format that indicates an image, return placeholder
  const hasImageExtension = /\.(gif|jpe?g|png|svg|webp)$/i.test(cleanUrl);
  if (!hasImageExtension && !cleanUrl.includes('storage') && !cleanUrl.includes('object')) {
    return '/placeholder.svg';
  }

  // If URL is already a valid HTTP or HTTPS URL, return it as is
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    // But check if it's a placeholder URL
    if (cleanUrl.includes('example.com') || cleanUrl.includes('example.org')) {
      return '/placeholder.svg';
    }
    return cleanUrl;
  }

  // If URL is a relative path starting with /, ensure it's properly formatted
  if (cleanUrl.startsWith('/')) {
    // Check if it's already prefixed with the public path
    if (cleanUrl.startsWith('/public/')) {
      return cleanUrl;
    }
    return cleanUrl;
  }

  // For other URLs, assume they might be from Supabase storage
  // and return them as is (the browser will resolve them)
  return cleanUrl;
};
