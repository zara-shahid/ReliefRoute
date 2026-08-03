"use client";

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Site, Route } from '@/types';
import { SimulatedVehicleState } from './VehicleSimulator';

interface MapProps {
  sites: Site[];
  routes: Route[];
  simulatedVehicles?: SimulatedVehicleState[];
  isVisible?: boolean;
}

function MapResizer({ isVisible }: { isVisible: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [map, isVisible]);
  return null;
}

const getUrgencyColor = (score: number) => {
  if (score >= 75) return { fill: '#ef4444', glow: 'rgba(239,68,68,0.6)', ring: 'rgba(239,68,68,0.25)' };
  if (score >= 50) return { fill: '#f59e0b', glow: 'rgba(245,158,11,0.6)', ring: 'rgba(245,158,11,0.2)' };
  return { fill: '#3b82f6', glow: 'rgba(59,130,246,0.6)', ring: 'rgba(59,130,246,0.2)' };
};

const createVehicleIcon = (name: string, heading: number) => {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:-4px;border-radius:50%;background:rgba(239,68,68,0.3);animation:ping 1.2s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="width:24px;height:24px;border-radius:50%;background:#ef4444;border:2px solid #ffffff;box-shadow:0 0 16px rgba(239,68,68,0.8);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;transform:rotate(${heading}deg);">
          ➔
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const createSiteIcon = (urgencyScore: number) => {
  const { fill, glow, ring } = getUrgencyColor(urgencyScore);
  const isUrgent = urgencyScore >= 75;
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
        ${isUrgent ? `<div style="position:absolute;inset:0;border-radius:50%;background:${ring};animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ''}
        <div style="position:absolute;inset:2px;border-radius:50%;background:${ring};"></div>
        <div style="width:14px;height:14px;border-radius:50%;background:${fill};border:2px solid rgba(255,255,255,0.9);box-shadow:0 0 12px ${glow},0 0 4px ${glow};position:relative;z-index:1;"></div>
      </div>
      <style>
        @keyframes ping{0%{transform:scale(1);opacity:0.8}75%,100%{transform:scale(1.8);opacity:0}}
      </style>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
};

const routeColors = ['#8b5cf6', '#06b6d4', '#10b981', '#f97316', '#ec4899', '#eab308'];

export default function MapComponent({ sites, routes, simulatedVehicles = [], isVisible = true }: MapProps) {
  const [mapStyle, setMapStyle] = useState<'voyager' | 'dark'>('voyager');

  const defaultCenter: [number, number] = sites.length > 0
    ? [sites[0].lat, sites[0].lng]
    : [37.7749, -122.4194];

  const tileUrl = mapStyle === 'voyager'
    ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Map Style Toggle Button */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 400,
          display: 'flex',
          gap: 4,
          background: 'rgba(13, 21, 41, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 8,
          padding: 4,
        }}
      >
        <button
          onClick={() => setMapStyle('voyager')}
          style={{
            background: mapStyle === 'voyager' ? '#3b82f6' : 'transparent',
            color: '#ffffff',
            border: 'none',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          High-Contrast Streets
        </button>
        <button
          onClick={() => setMapStyle('dark')}
          style={{
            background: mapStyle === 'dark' ? '#3b82f6' : 'transparent',
            color: '#ffffff',
            border: 'none',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Tactical Dark
        </button>
      </div>

      <MapContainer
        bounds={sites.length > 0 ? L.latLngBounds(sites.map(s => [s.lat, s.lng] as [number, number])) : undefined}
        center={sites.length === 0 ? [37.7749, -122.4194] : undefined}
        zoom={sites.length === 0 ? 13 : undefined}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer url={tileUrl} attribution="" />
        <MapResizer isVisible={isVisible} />

        {sites.map((site) => (
          <Marker
            key={`site-${site.id}`}
            position={[site.lat, site.lng]}
            icon={createSiteIcon(site.urgency_score || 0)}
          >
            <Popup closeButton={false} className="relief-popup">
              <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 210, padding: 4 }}>
                <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 800, color: '#ffffff', lineHeight: 1.3 }}>
                  {site.name.length > 50 ? site.name.slice(0, 50) + '…' : site.name}
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#93c5fd', fontWeight: 600 }}>📦 {site.resource_needed}</span>
                  <span style={{ fontSize: 12, color: '#93c5fd', fontWeight: 600 }}>👥 {site.people_affected} affected</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${site.urgency_score || 0}%`,
                      background: (site.urgency_score || 0) >= 75 ? 'linear-gradient(90deg,#f97316,#ef4444)' : '#3b82f6',
                      borderRadius: 99,
                    }}
                  />
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 11, color: '#60a5fa', fontWeight: 800, letterSpacing: '0.05em' }}>
                  URGENCY SCORE: {site.urgency_score || 0}/100
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

      {/* Render Simulated Moving Vehicle Markers */}
      {simulatedVehicles.map((veh) => (
        <Marker
          key={`veh-${veh.vehicleId}`}
          position={[veh.coords.lat, veh.coords.lng]}
          icon={createVehicleIcon(veh.vehicleName, veh.headingDeg)}
        />
      ))}

      {routes.map((route, idx) => {
        const color = routeColors[idx % routeColors.length];
        let positions: [number, number][] = [];

        if (route.roadGeometry && route.roadGeometry.length > 0) {
          positions = route.roadGeometry.map(c => [c.lat, c.lng]);
        } else {
          positions = route.stops
            .filter(s => s.coords && typeof s.coords.lat === 'number')
            .map(s => [s.coords!.lat, s.coords!.lng]);
        }

        if (positions.length < 2) return null;
        return (
          <Polyline
            key={`route-${route.id}`}
            positions={positions}
            pathOptions={{ color, weight: 4, opacity: 0.9, dashArray: '6, 6' }}
          />
        );
      })}
      </MapContainer>
    </div>
  );
}
