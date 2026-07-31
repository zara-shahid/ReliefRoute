import React, { useState } from 'react';
import { OptimizationResult, VehicleRoute } from '../types';
import { Truck, MapPin, Clock, ShieldAlert, CheckCircle, ChevronDown, ChevronUp, FileText, Zap, Award } from 'lucide-react';

interface RouteOverviewPanelProps {
  optimization: OptimizationResult | null;
}

export const RouteOverviewPanel: React.FC<RouteOverviewPanelProps> = ({ optimization }) => {
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);

  if (!optimization || optimization.routes.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-xl">
        <Truck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <h4 className="text-sm font-bold text-slate-300">No Vehicle Routes Generated Yet</h4>
        <p className="text-xs text-slate-500 mt-1">Submit a disaster report or click "Solve VRP Route" to calculate dispatch manifests.</p>
      </div>
    );
  }

  const { routes, metrics } = optimization;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      
      {/* Header & Efficiency Summary Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Dispatched Fleet Routes & Driver Manifests</h3>
            <p className="text-xs text-slate-400">
              {metrics.sitesFulfilledCount}/{metrics.totalSitesCount} sites allocated across {routes.length} active vehicles
            </p>
          </div>
        </div>

        {/* OR Efficiency Badge */}
        <div className="flex items-center space-x-2 bg-emerald-950/60 border border-emerald-800/80 px-3 py-1.5 rounded-xl text-xs text-emerald-300 self-start sm:self-auto">
          <Award className="w-4 h-4 text-emerald-400" />
          <div>
            <span className="font-bold">{metrics.distanceSavedPercent}% Distance Saved</span>
            <span className="text-[10px] text-emerald-400/80 block">
              ({metrics.totalDistanceKm} km vs {metrics.naiveDistanceKm} km naive)
            </span>
          </div>
        </div>
      </div>

      {/* Dispatched Vehicle Cards */}
      <div className="space-y-3">
        {routes.map((route) => {
          const isExpanded = expandedRouteId === route.vehicleId || routes.length === 1;

          return (
            <div
              key={route.vehicleId}
              className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden transition-all"
            >
              {/* Card Header */}
              <div
                onClick={() => setExpandedRouteId(isExpanded ? null : route.vehicleId)}
                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-900/60 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-rose-400 font-bold text-sm">
                    {route.stops.length}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-xs text-white">{route.vehicleName}</h4>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-medium">
                        Driver: {route.driverName}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-0.5">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-rose-400" />
                        <span>{route.stops.length} stops ({route.totalDistanceKm} km)</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>~{route.totalTimeMinutes} mins total</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Capacity Fill Bar */}
                <div className="flex items-center space-x-4">
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] text-slate-400 block">Cargo Capacity</span>
                    <span className="font-bold text-xs text-slate-200">
                      {route.loadUsed} / {route.capacity} units ({route.loadPercentage}%)
                    </span>
                    <div className="w-24 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          route.loadPercentage > 90
                            ? 'bg-amber-500'
                            : route.loadPercentage > 50
                            ? 'bg-rose-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${route.loadPercentage}%` }}
                      />
                    </div>
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Card Expanded Content */}
              {isExpanded && (
                <div className="p-3.5 border-t border-slate-800/80 bg-slate-900/40 space-y-3">
                  
                  {/* Stops Timeline */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                      Optimized Waypoint Sequence
                    </span>
                    <div className="space-y-2">
                      {route.stops.map((stop) => (
                        <div
                          key={stop.siteId}
                          className="flex items-start justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300"
                        >
                          <div className="flex items-center space-x-2.5">
                            <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px] flex items-center justify-center border border-rose-500/30">
                              #{stop.stopOrder}
                            </span>
                            <div>
                              <p className="font-semibold text-white">{stop.siteName}</p>
                              <span className="text-[10px] text-slate-400">
                                Delivers: <strong className="text-cyan-400">{stop.amountDelivered} units</strong> of {stop.resourceDelivered.toUpperCase()}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] font-semibold text-amber-400 block">
                              ETA: +{stop.estimatedArrivalTimeMin} mins
                            </span>
                            <span className="text-[9px] text-slate-500">
                              Urgency Score: {stop.urgencyScore}/100
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dispatch Plain Language Driver Instructions */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-1.5 flex items-center space-x-1">
                      <FileText className="w-3 h-3 text-purple-400" />
                      <span>Dispatch Agent Instructions</span>
                    </span>
                    <div className="bg-slate-950 p-3 rounded-lg border border-purple-900/30 text-xs text-slate-300 space-y-1 font-mono text-[11px]">
                      {route.driverInstructions.map((inst, idx) => (
                        <p key={idx} className="text-slate-300">
                          {inst}
                        </p>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};
