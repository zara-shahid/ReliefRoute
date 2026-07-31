import React, { useState, useEffect, useRef } from 'react';
import { VehicleRoute, LocationCoords } from '../types';
import { Play, Pause, RotateCcw, Truck, Gauge, Navigation, Activity } from 'lucide-react';

export interface SimulatedVehicleState {
  vehicleId: string;
  vehicleName: string;
  coords: LocationCoords;
  currentStopIndex: number;
  totalStops: number;
  progressPercent: number;
  speedKmh: number;
  headingDeg: number;
}

interface VehicleSimulatorProps {
  routes: VehicleRoute[];
  depotCoords: LocationCoords;
  onUpdateSimulatedVehicles: (vehicles: SimulatedVehicleState[]) => void;
}

export const VehicleSimulator: React.FC<VehicleSimulatorProps> = ({
  routes,
  depotCoords,
  onUpdateSimulatedVehicles,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(2);
  const [progress, setProgress] = useState<number>(0); // 0 to 100%

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Reset simulation when routes change
  useEffect(() => {
    setProgress(0);
    setIsPlaying(false);
  }, [routes]);

  // Main simulation loop
  useEffect(() => {
    if (!isPlaying || routes.length === 0) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      lastTimeRef.current = null;
      return;
    }

    const animate = (timestamp: number) => {
      if (lastTimeRef.current !== null) {
        const deltaSeconds = (timestamp - lastTimeRef.current) / 1000;
        // Increase progress based on speed multiplier
        const increment = (deltaSeconds * 2.5 * speedMultiplier); // ~40s for full route at 1x
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

  // Calculate position along path for each route based on overall progress %
  useEffect(() => {
    if (routes.length === 0) {
      onUpdateSimulatedVehicles([]);
      return;
    }

    const simulatedList: SimulatedVehicleState[] = routes.map((r) => {
      const allPoints: LocationCoords[] = [depotCoords, ...r.stops.map((s) => s.coords), depotCoords];
      if (allPoints.length < 2) {
        return {
          vehicleId: r.vehicleId,
          vehicleName: r.vehicleName,
          coords: depotCoords,
          currentStopIndex: 0,
          totalStops: r.stops.length,
          progressPercent: progress,
          speedKmh: 45,
          headingDeg: 0,
        };
      }

      // Total path segments = allPoints.length - 1
      const totalSegments = allPoints.length - 1;
      const scaledProgress = (progress / 100) * totalSegments;
      const segmentIndex = Math.min(Math.floor(scaledProgress), totalSegments - 1);
      const segmentT = scaledProgress - segmentIndex;

      const pStart = allPoints[segmentIndex];
      const pEnd = allPoints[segmentIndex + 1];

      const currentLat = pStart.lat + (pEnd.lat - pStart.lat) * segmentT;
      const currentLng = pStart.lng + (pEnd.lng - pStart.lng) * segmentT;

      // Heading angle
      const dLat = pEnd.lat - pStart.lat;
      const dLng = pEnd.lng - pStart.lng;
      const angleRad = Math.atan2(dLat, dLng);
      const headingDeg = (angleRad * 180) / Math.PI;

      return {
        vehicleId: r.vehicleId,
        vehicleName: r.vehicleName,
        coords: { lat: currentLat, lng: currentLng },
        currentStopIndex: Math.min(segmentIndex, r.stops.length),
        totalStops: r.stops.length,
        progressPercent: Math.round(progress),
        speedKmh: isPlaying ? 40 * speedMultiplier : 0,
        headingDeg,
      };
    });

    onUpdateSimulatedVehicles(simulatedList);
  }, [progress, routes, depotCoords, isPlaying, speedMultiplier, onUpdateSimulatedVehicles]);

  const handleReset = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl text-slate-100 flex flex-col space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-rose-500 animate-pulse" />
          <h3 className="font-bold text-sm text-white">Live Telemetry & Fleet Simulator</h3>
        </div>
        <span className="text-xs bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-full text-cyan-400 font-mono">
          {isPlaying ? 'LIVE STREAMING' : progress === 100 ? 'COMPLETED' : 'IDLE'}
        </span>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={routes.length === 0}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-all shadow cursor-pointer ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isPlaying ? 'Pause Simulation' : 'Start Simulation'}</span>
          </button>

          <button
            onClick={handleReset}
            disabled={routes.length === 0}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* Speed Multiplier */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <Gauge className="w-3.5 h-3.5 text-slate-400 ml-1" />
          {[1, 2, 5, 10].map((spd) => (
            <button
              key={spd}
              onClick={() => setSpeedMultiplier(spd)}
              className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                speedMultiplier === spd ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-slate-400 font-medium">
          <span>Route Telemetry Progress</span>
          <span className="font-mono text-cyan-400">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
          <div
            className="bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 h-full transition-all duration-100 ease-linear shadow-sm"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
