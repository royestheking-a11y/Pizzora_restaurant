import React, { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useApp } from '../context/AppContext';
import { pixelService } from '../utils/pixelService';

export function PixelTracker() {
  const location = useLocation();
  const app = useApp();
  const pixelSettings = app?.state?.pixelSettings;

  // Sync pixel service with current state settings
  useEffect(() => {
    try {
      if (pixelSettings) {
        pixelService.initFromSettings(pixelSettings);
      }
    } catch (err) {
      // Safe no-op if blocked by client browser or ad-blocker
    }
  }, [pixelSettings]);

  // Track PageView on route navigation
  useEffect(() => {
    try {
      if (pixelSettings?.enabled && pixelSettings?.trackPageView) {
        const timer = setTimeout(() => {
          try {
            pixelService.trackPageView(location.pathname + location.search, document.title);
          } catch (err) {
            // Safe no-op
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    } catch (err) {
      // Safe no-op
    }
  }, [location.pathname, location.search, pixelSettings?.enabled, pixelSettings?.trackPageView]);

  return null;
}
