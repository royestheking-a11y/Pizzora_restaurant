/// <reference types="vite/client" />
export const compressImage = (file: File, maxWidth = 800): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Compress as JPEG with 0.8 quality
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        
        try {
          // Upload to Cloudinary via backend
          const getBackendUrl = () => {
            if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL;
            if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
            if (typeof window !== 'undefined' && window.location.hostname === 'localhost') return 'http://localhost:3001';
            return window.location.origin;
          };
          const API_URL = getBackendUrl();
          const token = sessionStorage.getItem('pizzora_token');
          
          const response = await fetch(`${API_URL}/api/upload`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ imageBase64: compressedBase64 })
          });
          if (!response.ok) {
            reject(new Error(`Failed to upload image: ${response.statusText}`));
            return;
          }
          const data = await response.json();
          if (data.url) {
            resolve(data.url);
          } else {
            reject(new Error('Failed to upload image: url missing'));
          }
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};
