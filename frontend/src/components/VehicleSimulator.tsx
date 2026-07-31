"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Route } from '@/types';
import { Play, Pause, RotateCcw, Activity, Gauge } from 'lucide-react';

export interface SimulatedVehicleState {
  vehicleId: number | string;
  vehicleName: string;
  coords: { lat: number; lng: number };
  currentStopIndex: number;
  totalStops: number;
  progressPercent: number;
  speedKmh: number;
  headingDeg: number;
}

interface VehicleSimulatorProps {
  routes: Route[];
  onUpdateSimulatedVehicles: (vehicles: SimulatedVehicleState[]) => void;
}

export default function VehicleSimulator({
  routes,
  onUpdateSimulatedVehicles,
}: VehicleSimulatorProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(2);
  const [progress, setProgress] = useState<number>(0);

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    setProgress(0);
    setIsPlaying(false);
  }, [routes]);

  useEffect(() => {
    if (!isPlaying || routes.length === 0) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      lastTimeRef.current = null;
      return;
    }

    const animate = (timestamp: number) => {
      if (lastTimeRef.current !== null) {
        const deltaSeconds = (timestamp - lastTimeRef.current) / 1000;
        const increment = (deltaSeconds * 2.5 * speedMultiplier);
        setProgress((prev) => {
          const next = prev + increment;
          if (next >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return next;
        });
      }
      lastTimeRef.current = timestamp;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, speedMultiplier, routes]);

  useEffect(() => {
    if (routes.length === 0) {
      onUpdateSimulatedVehicles([]);
      return;
    }

    const simulatedList: SimulatedVehicleState[] = routes.map((r) => {
      let pathCoords: { lat: number; lng: number }[] = [];
      if (r.roadGeometry && r.roadGeometry.length > 1) {
        pathCoords = r.roadGeometry;
      } else {
        pathCoords = r.stops
          .filter((s) => s.coords && typeof s.coords.lat === 'number')
          .map((s) => ({ lat: s.coords!.lat, lng: s.coords!.lng }));
      }

      if (pathCoords.length < 2) {
        const fallback = pathCoords[0] || { lat: 37.7749, lng: -122.4194 };
        return {
          vehicleId: r.id,
          vehicleName: r.vehicle_name || 'Dispatch Vehicle',
          coords: fallback,
          currentStopIndex: 0,
          totalStops: r.stops.length,
          progressPercent: progress,
          speedKmh: 45,
          headingDeg: 0,
        };
      }

      const totalSegments = pathCoords.length - 1;
      const scaledProgress = (progress / 100) * totalSegments;
      const segmentIndex = Math.min(Math.floor(scaledProgress), totalSegments - 1);
      const segmentT = scaledProgress - segmentIndex;

      const pStart = pathCoords[segmentIndex];
      const pEnd = pathCoords[segmentIndex + 1];

      const currentLat = pStart.lat + (pEnd.lat - pStart.lat) * segmentT;
      const currentLng = pStart.lng + (pEnd.lng - pStart.lng) * segmentT;

      const dLat = pEnd.lat - pStart.lat;
      const dLng = pEnd.lng - pStart.lng;
      const angleRad = Math.atan2(dLat, dLng);
      const headingDeg = (angleRad * 180) / Math.PI;

      return {
        vehicleId: r.id,
        vehicleName: r.vehicle_name || `Vehicle ${r.vehicle}`,
        coords: { lat: currentLat, lng: currentLng },
        currentStopIndex: Math.min(segmentIndex, r.stops.length),
        totalStops: r.stops.length,
        progressPercent: Math.round(progress),
        speedKmh: isPlaying ? 40 * speedMultiplier : 0,
        headingDeg,
      };
    });

    onUpdateSimulatedVehicles(simulatedList);
  }, [progress, routes, isPlaying, speedMultiplier, onUpdateSimulatedVehicles]);

  return (
    <div
      style={{
        background: 'rgba(13,21,41,0.7)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        color: '#e2eeff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Activity size={16} color="#ef4444" className="animate-pulse" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>Live Fleet Simulator</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={routes.length === 0}
            style={{
              background: isPlaying ? '#d97706' : '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            {isPlaying ? 'Pause' : 'Start Simulation'}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setProgress(0);
            }}
            disabled={routes.length === 0}
            style={{
              background: 'rgba(255,255,255,0.08)',
              color: '#94a3b8',
              border: 'none',
              borderRadius: 6,
              padding: '4px 8px',
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <RotateCcw size={12} />
            Reset
          </button>

          <div style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.3)', padding: 2, borderRadius: 6 }}>
            {[1, 2, 5, 10].map((spd) => (
              <button
                key={spd}
                onClick={() => setSpeedMultiplier(spd)}
                style={{
                  background: speedMultiplier === spd ? '#3b82f6' : 'transparent',
                  color: speedMultiplier === spd ? '#ffffff' : '#64748b',
                  border: 'none',
                  borderRadius: 4,
                  padding: '2px 6px',
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #ef4444, #f59e0b, #10b981)',
            transition: 'width 0.1s linear',
          }}
        />
      </div>
    </div>
  );
}
