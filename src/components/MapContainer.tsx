import React, { useState, useEffect } from 'react';
import { DisasterSite, VehicleRoute, LocationCoords } from '../types';
import { SimulatedVehicleState } from './VehicleSimulator';
import { MapPin, Navigation, Compass, Layers, ShieldAlert, Truck, Info, Zap } from 'lucide-react';

interface MapContainerProps {
  sites: DisasterSite[];
  routes: VehicleRoute[];
  depotCoords: LocationCoords;
  selectedSiteId?: string | null;
  onSelectSite: (site: DisasterSite | null) => void;
  simulatedVehicles?: SimulatedVehicleState[];
}

const ROUTE_COLORS = [
  { stroke: '#f43f5e', bg: 'bg-rose-500', label: 'Route Alpha (Red)' },
  { stroke: '#06b6d4', bg: 'bg-cyan-500', label: 'Route Bravo (Cyan)' },
  { stroke: '#a855f7', bg: 'bg-purple-500', label: 'Route Charlie (Purple)' },
  { stroke: '#10b981', bg: 'bg-emerald-500', label: 'Route Delta (Green)' },
];

export const MapContainer: React.FC<MapContainerProps> = ({
  sites,
  routes,
  depotCoords,
  selectedSiteId,
  onSelectSite,
  simulatedVehicles = [],
}) => {
  const [mapMode, setMapMode] = useState<'tactical' | 'leaflet'>('tactical');
  const [activeTabSite, setActiveTabSite] = useState<DisasterSite | null>(null);

  useEffect(() => {
    if (selectedSiteId) {
      const match = sites.find((s) => s.id === selectedSiteId);
      if (match) setActiveTabSite(match);
    }
  }, [selectedSiteId, sites]);

  // Coordinate normalizer for SVG canvas positioning
  // Map bounds around SF Bay Area simulation zone
  const minLat = 37.74;
  const maxLat = 37.82;
  const minLng = -122.49;
  const maxLng = -122.39;

  const getCanvasCoords = (coords: LocationCoords) => {
    const xPercent = Math.min(95, Math.max(5, ((coords.lng - minLng) / (maxLng - minLng)) * 100));
    // Invert Y because SVG 0 is top
    const yPercent = Math.min(92, Math.max(8, (1 - (coords.lat - minLat) / (maxLat - minLat)) * 100));
    return { x: xPercent, y: yPercent };
  };

  const depotPos = getCanvasCoords(depotCoords);

  // Map site ID to vehicle route stop info
  const siteRouteInfo = new Map<string, { routeIndex: number; vehicleName: string; stopOrder: number; color: string }>();
  routes.forEach((r, rIdx) => {
    const colorObj = ROUTE_COLORS[rIdx % ROUTE_COLORS.length];
    r.stops.forEach((st) => {
      siteRouteInfo.set(st.siteId, {
        routeIndex: rIdx,
        vehicleName: r.vehicleName,
        stopOrder: st.stopOrder,
        color: colorObj.stroke,
      });
    });
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[400px] lg:h-[580px] relative">
      
      {/* Map Control Bar */}
      <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
        <div className="flex items-center space-x-2">
          <Compass className="w-4 h-4 text-rose-400 animate-spin-slow" />
          <span className="font-semibold text-white">Live Disaster Operational Grid</span>
          <span className="text-slate-500 hidden sm:inline">| San Francisco Metro Disaster Sector</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setMapMode('tactical')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium ${
              mapMode === 'tactical'
                ? 'bg-rose-600 text-white shadow'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Tactical SVG Grid
          </button>
          <button
            onClick={() => setMapMode('leaflet')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium ${
              mapMode === 'leaflet'
                ? 'bg-rose-600 text-white shadow'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Satellite Hybrid
          </button>
        </div>
      </div>

      {/* Main Map Canvas Display */}
      <div className="relative flex-1 bg-slate-950 overflow-hidden select-none">
        {/* Background Grid Pattern */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(#475569 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Map Top-Right Route Legend */}
        <div className="absolute top-3 right-3 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-2.5 rounded-xl shadow-lg text-[11px] space-y-1.5 max-w-[200px]">
          <div className="font-bold text-slate-200 border-b border-slate-800 pb-1 flex items-center justify-between">
            <span>Route Dispatches</span>
            <Layers className="w-3.5 h-3.5 text-slate-400" />
          </div>
          {routes.length === 0 ? (
            <p className="text-slate-500 italic">No routes calculated</p>
          ) : (
            routes.map((r, idx) => {
              const cObj = ROUTE_COLORS[idx % ROUTE_COLORS.length];
              return (
                <div key={r.vehicleId} className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${cObj.bg} shadow-sm shrink-0`} />
                  <span className="text-slate-300 font-medium truncate" title={r.vehicleName}>
                    {r.vehicleName.split(' ')[0]} ({r.stops.length} stops)
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Tactical Map Canvas Vector Renderer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Render Route Polyline Connections */}
          {routes.map((r, rIdx) => {
            const colorObj = ROUTE_COLORS[rIdx % ROUTE_COLORS.length];
            if (r.stops.length === 0) return null;

            // Build point path sequence: Depot -> Stop 1 -> Stop 2 ... -> Depot
            const points: { x: number; y: number }[] = [depotPos];
            r.stops.forEach((st) => points.push(getCanvasCoords(st.coords)));
            points.push(depotPos);

            const pathString = points
              .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x}% ${pt.y}%`)
              .join(' ');

            return (
              <g key={`route-path-${r.vehicleId}`}>
                {/* Outer Glow Route Stroke */}
                <path
                  d={pathString}
                  fill="none"
                  stroke={colorObj.stroke}
                  strokeWidth="4"
                  strokeOpacity="0.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Main Directional Route Line */}
                <path
                  d={pathString}
                  fill="none"
                  stroke={colorObj.stroke}
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="animate-pulse"
                />
              </g>
            );
          })}
        </svg>

        {/* Base Logistics Hub Depot Marker */}
        <div
          className="absolute z-20 -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
          style={{ left: `${depotPos.x}%`, top: `${depotPos.y}%` }}
        >
          <div className="relative flex items-center justify-center">
            <div className="absolute w-10 h-10 rounded-full bg-cyan-500/20 animate-ping" />
            <div className="w-8 h-8 rounded-full bg-cyan-600 border-2 border-white flex items-center justify-center shadow-lg text-white font-bold text-xs">
              <Truck className="w-4 h-4" />
            </div>
            <div className="absolute top-9 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-[10px] text-cyan-300 font-semibold whitespace-nowrap shadow-md">
              HQ Logistics Depot
            </div>
          </div>
        </div>

        {/* Live Moving Simulated Vehicles */}
        {simulatedVehicles.map((veh, vIdx) => {
          const vPos = getCanvasCoords(veh.coords);
          const colorObj = ROUTE_COLORS[vIdx % ROUTE_COLORS.length];
          return (
            <div
              key={`sim-veh-${veh.vehicleId}`}
              className="absolute z-30 -translate-x-1/2 -translate-y-1/2 transition-all duration-75 pointer-events-none"
              style={{ left: `${vPos.x}%`, top: `${vPos.y}%` }}
            >
              <div className="relative flex flex-col items-center">
                <div className="absolute w-9 h-9 rounded-full bg-rose-500/30 animate-ping" />
                <div
                  className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center shadow-2xl text-white font-extrabold text-[10px] transition-transform duration-100"
                  style={{ backgroundColor: colorObj.stroke }}
                >
                  <Navigation
                    className="w-4 h-4"
                    style={{ transform: `rotate(${veh.headingDeg}deg)` }}
                  />
                </div>
                <div className="mt-1 bg-slate-950 border border-slate-700 px-2 py-0.5 rounded text-[9px] font-bold text-white whitespace-nowrap shadow-xl flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>{veh.vehicleName.split(' ')[0]} ({veh.speedKmh} km/h)</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Disaster Sites Pin Markers */}
        {sites.map((site) => {
          const pos = getCanvasCoords(site.coords);
          const isSelected = activeTabSite?.id === site.id;
          const routeInfo = siteRouteInfo.get(site.id);

          let badgeBg = 'bg-blue-500';
          let ringColor = 'ring-blue-500/30';
          if (site.urgencyScore >= 85) {
            badgeBg = 'bg-rose-600';
            ringColor = 'ring-rose-500/50';
          } else if (site.urgencyScore >= 70) {
            badgeBg = 'bg-amber-500';
            ringColor = 'ring-amber-500/40';
          } else if (site.urgencyScore >= 50) {
            badgeBg = 'bg-yellow-500';
            ringColor = 'ring-yellow-500/30';
          }

          return (
            <div
              key={site.id}
              onClick={() => {
                setActiveTabSite(site);
                onSelectSite(site);
              }}
              className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 hover:scale-125 ${
                isSelected ? 'scale-125 z-30' : ''
              }`}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              <div className="relative flex flex-col items-center">
                {/* Stop Order Indicator Pill */}
                {routeInfo && (
                  <div
                    className="mb-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold text-white shadow border border-white/40 whitespace-nowrap"
                    style={{ backgroundColor: routeInfo.color }}
                  >
                    Stop #{routeInfo.stopOrder}
                  </div>
                )}

                {/* Site Marker Pin */}
                <div
                  className={`w-7 h-7 rounded-full ${badgeBg} border-2 ${
                    isSelected ? 'border-white ring-4 ring-rose-400' : 'border-slate-900'
                  } flex items-center justify-center text-white font-bold text-xs shadow-lg ${ringColor}`}
                >
                  <MapPin className="w-4 h-4" />
                </div>

                {/* Site Label */}
                <div className="mt-1 px-1.5 py-0.5 bg-slate-900/90 border border-slate-800 rounded text-[9px] font-semibold text-slate-200 whitespace-nowrap max-w-[110px] truncate shadow">
                  {site.name}
                </div>
              </div>
            </div>
          );
        })}

        {/* Selected Site Detail Drawer Overlay */}
        {activeTabSite && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md z-30 bg-slate-900/95 border border-slate-700 p-4 rounded-xl shadow-2xl backdrop-blur-md text-xs text-slate-200">
            <div className="flex items-start justify-between pb-2 border-b border-slate-800">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-rose-400">
                  {activeTabSite.resourceNeeded.toUpperCase()} RELIEF REQUIRED
                </span>
                <h4 className="font-bold text-sm text-white">{activeTabSite.name}</h4>
                <p className="text-[11px] text-slate-400">{activeTabSite.locationName}</p>
              </div>
              <button
                onClick={() => setActiveTabSite(null)}
                className="text-slate-400 hover:text-white text-base leading-none px-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 my-2.5 text-center">
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Severity</span>
                <span className="font-bold text-rose-400 text-sm">{activeTabSite.severity}/5</span>
              </div>
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Urgency Score</span>
                <span className="font-bold text-amber-400 text-sm">{activeTabSite.urgencyScore}/100</span>
              </div>
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Units Needed</span>
                <span className="font-bold text-cyan-400 text-sm">{activeTabSite.amountNeeded}</span>
              </div>
            </div>

            <p className="text-slate-300 italic text-[11px] line-clamp-2 bg-slate-950/50 p-2 rounded border border-slate-800/80">
              "{activeTabSite.description}"
            </p>

            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
              <span>Impact: {activeTabSite.peopleAffected} citizens</span>
              <span>Target Window: {activeTabSite.urgencyWindowHours} hours</span>
            </div>
          </div>
        )}
      </div>

      {/* Map Footer Bar Legend */}
      <div className="bg-slate-950 px-4 py-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-600" />
            <span>Critical Priority (85+)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>High (70-84)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Standard</span>
          </div>
        </div>
        <span className="hidden sm:inline text-slate-500">Haversine VRP Distance Model</span>
      </div>

    </div>
  );
};
