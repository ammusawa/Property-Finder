'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';

interface PropertyMapProps {
  latitude: number;
  longitude: number;
  title: string;
}

export default function PropertyMap({ latitude, longitude, title }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView([latitude, longitude], 13);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add marker
    L.marker([latitude, longitude])
      .addTo(map)
      .bindPopup(title)
      .openPopup();

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude, title]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}

