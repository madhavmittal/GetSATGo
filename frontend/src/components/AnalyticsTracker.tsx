import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { analytics } from '../services/analytics';

export const AnalyticsTracker = () => {
  const { pathname } = useLocation();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (lastTrackedPath.current !== pathname) {
      analytics.trackPageView(pathname);
      lastTrackedPath.current = pathname;
    }
  }, [pathname]);

  return null;
};
