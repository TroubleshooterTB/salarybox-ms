import { useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import useStore from '../../store';

interface LiveTrackerProps {
  punchedIn: boolean;
}

export default function LiveTracker({ punchedIn }: LiveTrackerProps) {
  const { userProfile } = useStore();
  const watchId = useRef<number | null>(null);
  const lastSyncTime = useRef<number>(0);

  useEffect(() => {
    // Only track if user is punched in and profile is loaded
    if (!punchedIn || !userProfile?.id) {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      return;
    }

    if ('geolocation' in navigator) {
      watchId.current = navigator.geolocation.watchPosition(
        async (position) => {
          const now = Date.now();
          // Throttle updates to max once every 30 seconds
          if (now - lastSyncTime.current > 30000) {
            lastSyncTime.current = now;
            
            try {
              await supabase
                .from('profiles')
                .update({
                  current_latitude: position.coords.latitude,
                  current_longitude: position.coords.longitude,
                  last_location_update: new Date().toISOString()
                })
                .eq('id', userProfile.id);
            } catch (err) {
              console.error('Failed to sync live location:', err);
            }
          }
        },
        (error) => {
          console.warn('Live tracking geolocation error:', error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 10000
        }
      );
    }

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, [punchedIn, userProfile?.id]);

  return null; // Hidden component
}
