"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { getSites, getVehicles, getRoutes, optimizeRoutes, createSite, deleteSite, createVehicle } from '@/lib/api';
import { Site, Vehicle, Route } from '@/types';
import DispatchChat from '@/components/DispatchChat';
import VehicleSimulator, { SimulatedVehicleState } from '@/components/VehicleSimulator';
import SiteFleetManager from '@/components/SiteFleetManager';
import { MapPin, Truck, AlertTriangle, Play, Trash2, Navigation, Clock, Map, MessageSquare, Activity, Database } from 'lucide-react';

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#070d1e]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 rounded-full border-2 border-t-cyan-500 border-cyan-500/20 animate-spin" />
        <span className="text-xs font-semibold text-slate-400 tracking-widest" style={{ fontFamily: "'DM Mono', monospace" }}>LOADING TACTICAL MAP...</span>
      </div>
    </div>
  )
});

type Tab = 'map' | 'operations' | 'chat' | 'simulator';

function UrgencyBadge({ score }: { score: number }) {
  if (score >= 75) return (
    <span className="px-2 py-0.5 text-[10px] font-black tracking-wider uppercase bg-rose-500/15 text-rose-400 border border-rose-500/30" style={{ clipPath: 'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)' }}>CRITICAL</span>
  );
  if (score >= 50) return (
    <span className="px-2 py-0.5 text-[10px] font-black tracking-wider uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30" style={{ clipPath: 'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)' }}>HIGH</span>
  );
  return (
    <span className="px-2 py-0.5 text-[10px] font-black tracking-wider uppercase bg-cyan-500/15 text-cyan-400 border border-cyan-500/30" style={{ clipPath: 'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)' }}>ACTIVE</span>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-900/80 border border-slate-800 flex-1" style={{ borderLeft: `2px solid ${color}` }}>
      <div style={{ color }}>{icon}</div>
      <div>
        <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">{label}</div>
        <div className="text-base font-black text-slate-100 leading-tight">{value}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [sites, setSites] = useState<Site[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [simulatedVehicles, setSimulatedVehicles] = useState<SimulatedVehicleState[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('map');

  const fetchData = async () => {
    try {
      const [sitesData, vehiclesData, routesData] = await Promise.all([getSites(), getVehicles(), getRoutes()]);
      setSites(sitesData); setVehicles(vehiclesData); setRoutes(routesData);
      setIsLive(true);
    } catch (e) { console.error(e); setIsLive(false); }
  };

  const handleAddSite = async (data: Partial<Site>) => { await createSite(data); await handleOptimize(); };
  const handleDeleteSite = async (id: number) => { await deleteSite(id); await handleOptimize(); };
  const handleAddVehicle = async (data: Partial<Vehicle>) => { await createVehicle(data); await handleOptimize(); };

  const handleOptimize = async () => {
    setIsOptimizing(true);
    try { await optimizeRoutes(); await fetchData(); }
    catch (e) { console.error(e); }
    finally { setIsOptimizing(false); }
  };

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 5000); return () => clearInterval(i); }, []);

  const criticalSites = sites.filter(s => (s.urgency_score || 0) >= 75);
  const sortedSites = [...sites].sort((a, b) => (b.urgency_score || 0) - (a.urgency_score || 0));
  const totalKm = routes.reduce((sum, r) => sum + (r.total_distance_km || 0), 0);
  const maxEta = Math.max(...routes.map(r => r.total_time_minutes || 0), 0);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'map',        label: 'Tactical Map',  icon: <Map className="w-3.5 h-3.5" /> },
    { id: 'operations', label: 'Operations',    icon: <Database className="w-3.5 h-3.5" />, badge: criticalSites.length },
    { id: 'chat',       label: 'Dispatch AI',   icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: 'simulator',  label: 'Fleet Sim',     icon: <Activity className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#030712] text-slate-100 flex flex-col" style={{ fontFamily: "'DM Mono', monospace" }}>

      {/* HEADER */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-2.5 bg-[#070d1e]" style={{ borderBottom: '1px solid rgba(14,165,233,0.2)' }}>
        <div className="flex items-center gap-3">
          <Link href="/" title="Back to Landing Page">
            <div className="w-8 h-8 flex items-center justify-center font-black text-base text-red-400 bg-red-500/10 border border-red-500/50 hover:bg-red-500/20 transition-all" style={{ clipPath: 'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))', boxShadow: '0 0 10px rgba(239,68,68,0.25)' }}>R</div>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-tight text-white">ReliefRoute</h1>
              <span className="text-[9px] text-cyan-400 tracking-widest">[ COMMAND ]</span>
            </div>
            <p className="text-[9px] text-slate-600 tracking-widest uppercase">Ops Research Rerouting Engine</p>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-2">
          <StatCard label="Critical" value={criticalSites.length} icon={<AlertTriangle className="w-3.5 h-3.5" />} color="#ef4444" />
          <StatCard label="Sites" value={sites.length} icon={<MapPin className="w-3.5 h-3.5" />} color="#0ea5e9" />
          <StatCard label="Routes" value={routes.length} icon={<Truck className="w-3.5 h-3.5" />} color="#10b981" />
          <StatCard label="Distance" value={`${totalKm.toFixed(1)} km`} icon={<Navigation className="w-3.5 h-3.5" />} color="#8b5cf6" />
          <StatCard label="Max ETA" value={`${Math.round(maxEta)}m`} icon={<Clock className="w-3.5 h-3.5" />} color="#f97316" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleOptimize} disabled={isOptimizing}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white disabled:opacity-50 cursor-pointer"
            style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.25),rgba(14,165,233,0.25))', border: '1px solid #ef4444', borderRight: '3px solid #0ea5e9', letterSpacing: '0.08em' }}>
            <Play className={`w-3 h-3 fill-white ${isOptimizing ? 'animate-spin' : ''}`} />
            {isOptimizing ? 'SOLVING...' : '[ SOLVE VRP ]'}
          </button>
          <div className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold border ${isLive ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : 'border-amber-500/40 text-amber-400 bg-amber-500/10'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {isLive ? 'LIVE' : 'OFFLINE'}
          </div>
        </div>
      </header>

      {/* TAB BAR */}
      <nav className="flex-shrink-0 flex items-center bg-[#050a14]" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-5 py-3 text-[11px] font-bold tracking-widest uppercase cursor-pointer"
            style={{ color: activeTab === tab.id ? '#0ea5e9' : 'rgba(100,116,139,0.8)', background: activeTab === tab.id ? 'rgba(14,165,233,0.05)' : 'transparent', borderBottom: activeTab === tab.id ? '2px solid #0ea5e9' : '2px solid transparent', transition: 'all 0.2s' }}>
            {tab.icon}
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center font-black">{tab.badge}</span>
            )}
          </button>
        ))}
      </nav>

        {/* VIEWS */}
        <main className="flex-1 min-h-0 overflow-hidden relative">

          {/* TACTICAL MAP TAB */}
          <div className={`w-full h-full relative ${activeTab === 'map' ? 'block' : 'hidden'}`}>
            <MapComponent sites={sites} routes={routes} simulatedVehicles={simulatedVehicles} />
            <div className="absolute top-4 right-4 pointer-events-none flex flex-col gap-1.5 z-[1000]">
              {[
                { label: 'SITES ACTIVE', value: sites.length, cls: 'text-cyan-400', border: 'border-slate-800' },
                { label: 'ROUTES LIVE', value: routes.length, cls: 'text-emerald-400', border: 'border-slate-800' },
                { label: 'CRITICAL', value: criticalSites.length, cls: 'text-rose-400', border: 'border-rose-500/30' },
              ].map(item => (
                <div key={item.label} className={`px-3 py-1.5 bg-[#030712]/85 backdrop-blur border ${item.border} text-[10px] ${item.cls}`}>
                  {item.label}: <span className="font-black">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* OPERATIONS TAB */}
          <div className={`h-full overflow-y-auto p-6 bg-[#030712] ${activeTab === 'operations' ? 'block' : 'hidden'}`}>
            <div className="max-w-6xl mx-auto flex flex-col gap-6">
              <div>
                <div className="text-[10px] text-red-400 tracking-widest mb-1">[ OPERATIONS HQ ]</div>
                <h2 className="text-2xl font-black text-white">Disaster Sites &amp; Routes</h2>
                <div className="w-12 h-0.5 bg-gradient-to-r from-red-500 to-cyan-500 mt-2" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 p-4">
                  <div className="text-[10px] text-slate-500 tracking-widest mb-3">[ ADD INCIDENT / VEHICLE ]</div>
                  <SiteFleetManager sites={sites} vehicles={vehicles} onAddSite={handleAddSite} onDeleteSite={handleDeleteSite} onAddVehicle={handleAddVehicle} />
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4">
                  <div className="text-[10px] text-slate-500 tracking-widest mb-3">[ ROUTE SOLUTIONS ]</div>
                  {routes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-slate-600 gap-2">
                      <Truck className="w-8 h-8 opacity-20" />
                      <p className="text-[11px]">No routes. Click [ SOLVE VRP ] to generate.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {routes.map((route, i) => (
                        <div key={route.id} className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800">
                          <div>
                            <div className="text-xs font-bold text-slate-200">{route.vehicle_name || `Vehicle ${i + 1}`}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{route.stops?.length || 0} stops · ETA {Math.round(route.total_time_minutes || 0)} min</div>
                          </div>
                          <div className="text-sm font-black text-emerald-400">{route.total_distance_km?.toFixed(1)} km</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                  <div className="text-[10px] text-slate-500 tracking-widest">[ ACTIVE DISASTER SITES ]</div>
                  <div className="text-[10px] text-slate-600">{sites.length} TOTAL · {criticalSites.length} CRITICAL</div>
                </div>
                <div className="divide-y divide-slate-800/50">
                  {sortedSites.length === 0 ? (
                    <div className="text-center py-16 text-slate-600 text-[11px]">NO ACTIVE SITES REGISTERED</div>
                  ) : sortedSites.map((site) => (
                    <div key={site.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-800/20 transition-colors group">
                      <UrgencyBadge score={site.urgency_score || 0} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-200 truncate">{site.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Affected: {site.people_affected} · Resource: {site.resource_needed}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-28">
                          <div className="text-[9px] text-slate-600 mb-1">URGENCY {site.urgency_score || 0}%</div>
                          <div className="w-full h-1 bg-slate-800">
                            <div className={`h-full transition-all ${(site.urgency_score || 0) >= 75 ? 'bg-rose-500' : (site.urgency_score || 0) >= 50 ? 'bg-amber-500' : 'bg-cyan-500'}`} style={{ width: `${site.urgency_score || 0}%` }} />
                          </div>
                        </div>
                        <button onClick={() => handleDeleteSite(site.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 p-1 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* DISPATCH AI TAB */}
          <div className={`h-full flex ${activeTab === 'chat' ? 'block' : 'hidden'}`}>
            <div className="flex-1 h-full max-w-3xl mx-auto">
              <DispatchChat />
            </div>
          </div>

          {/* FLEET SIM TAB */}
          <div className={`h-full overflow-y-auto p-6 bg-[#030712] ${activeTab === 'simulator' ? 'block' : 'hidden'}`}>
            <div className="max-w-4xl mx-auto flex flex-col gap-6">
              <div>
                <div className="text-[10px] text-cyan-400 tracking-widest mb-1">[ FLEET OPERATIONS ]</div>
                <h2 className="text-2xl font-black text-white">Live Fleet Simulator</h2>
                <div className="w-12 h-0.5 bg-gradient-to-r from-cyan-500 to-emerald-500 mt-2" />
              </div>
              <div className="bg-slate-900/50 border border-slate-800 p-4">
                <VehicleSimulator routes={routes} onUpdateSimulatedVehicles={setSimulatedVehicles} />
              </div>
              {routes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {routes.map((route, i) => {
                    const sim = simulatedVehicles.find(v => v.vehicleId === route.id);
                    const progress = sim?.progressPercent ?? 0;
                    return (
                      <div key={route.id} className="bg-slate-900/50 border border-slate-800 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="text-xs font-bold text-slate-200">{route.vehicle_name || `Vehicle ${i + 1}`}</div>
                            <div className="text-[10px] text-slate-500">{route.stops?.length || 0} stops · {route.total_distance_km?.toFixed(1)} km</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-black text-cyan-400">{progress}%</div>
                            <div className="text-[10px] text-slate-500">{sim?.speedKmh ?? 0} km/h</div>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800">
                          <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #0ea5e9, #10b981)' }} />
                        </div>
                        <div className="mt-2 text-[10px] text-slate-600">STOP {sim?.currentStopIndex ?? 0} / {sim?.totalStops ?? route.stops?.length ?? 0}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-slate-600 gap-4">
                  <Activity className="w-12 h-12 opacity-20" />
                  <p className="text-[11px] tracking-widest">NO ROUTES TO SIMULATE</p>
                  <p className="text-[11px] text-slate-700">Run [ SOLVE VRP ] first to generate routes</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }
