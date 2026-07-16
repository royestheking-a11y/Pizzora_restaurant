/**
 * Optimizes a Cloudinary URL to request a compressed WebP format and a smaller size,
 * which drastically reduces the payload size sent to the client (e.g. from 3MB down to 30KB).
 */
export const optimizeCloudinaryUrl = (url: string, width: number = 800): string => {
  if (!url) return '';
  if (!url.includes('res.cloudinary.com')) return url;
  
  // Prevent double-applying transformations
  if (url.includes('/upload/q_auto')) return url;
  
  const parts = url.split('/upload/');
  if (parts.length === 2) {
    return `${parts[0]}/upload/q_auto,f_auto,w_${width}/${parts[1]}`;
  }
  
  return url;
};
