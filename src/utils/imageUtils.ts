
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

  // Explicitly handle Supabase storage URLs
  if (cleanUrl.includes('supabase.co/storage/v1/object/public')) {
    // If it's already a full URL starting with https://, return it as is
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      return cleanUrl;
    }
    
    // If URL starts with /storage/v1/, add the base URL
    if (cleanUrl.startsWith('/storage/v1/')) {
      const baseUrl = typeof window !== 'undefined' 
        ? `${window.location.protocol}//${window.location.host}`
        : '';
      return `${baseUrl}${cleanUrl}`;
    }
    
    // If URL doesn't have protocol but has supabase domain, add https://
    if (cleanUrl.includes('supabase.co') && !cleanUrl.startsWith('http')) {
      return `https://${cleanUrl}`;
    }
    
    return cleanUrl;
  }
  
  // Special handling for storage.googleapis.com URLs
  if (cleanUrl.includes('storage.googleapis.com')) {
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      return `https://${cleanUrl}`;
    }
    return cleanUrl;
  }

  // Handle URLs that start with "storage/v1/" but don't include supabase domain
  if (cleanUrl.startsWith('storage/v1/')) {
    return `https://sxjafhzikftdenqnkcri.supabase.co/${cleanUrl}`;
  }

  // If URL doesn't have an extension that indicates an image, check more thoroughly
  const hasImageExtension = /\.(gif|jpe?g|png|svg|webp)$/i.test(cleanUrl);
  if (!hasImageExtension) {
    // Check if it might be a Supabase storage URL without extension
    if (cleanUrl.includes('storage') || cleanUrl.includes('object/public')) {
      return cleanUrl;
    }
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
  // and prepend the Supabase URL if they look like partial storage paths
  if (cleanUrl.includes('batch/') || cleanUrl.includes('exercise-gifs/')) {
    return `https://sxjafhzikftdenqnkcri.supabase.co/storage/v1/object/public/${cleanUrl}`;
  }

  // Return as is for any other case
  return cleanUrl;
};
