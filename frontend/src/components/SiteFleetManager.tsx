"use client";

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Site, Vehicle } from '@/types';

interface SiteFleetManagerProps {
  sites: Site[];
  vehicles: Vehicle[];
  onAddSite: (siteData: Partial<Site>) => Promise<void>;
  onDeleteSite: (id: number) => Promise<void>;
  onAddVehicle: (vehicleData: Partial<Vehicle>) => Promise<void>;
}

export default function SiteFleetManager({
  sites,
  vehicles,
  onAddSite,
  onAddVehicle,
}: SiteFleetManagerProps) {
  const [activeTab, setActiveTab] = useState<'sites' | 'vehicles'>('sites');
  const [siteName, setSiteName] = useState('');
  const [resource, setResource] = useState('water');
  const [amount, setAmount] = useState(50);
  const [severity, setSeverity] = useState(3);
  const [affected] = useState(100);

  const [vehName, setVehName] = useState('');
  const [capacity, setCapacity] = useState(100);

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName) return;
    await onAddSite({
      name: siteName,
      location_name: 'San Francisco Sector',
      lat: 37.76 + (Math.random() - 0.5) * 0.08,
      lng: -122.42 + (Math.random() - 0.5) * 0.08,
      resource_needed: resource,
      amount_needed: Number(amount),
      people_affected: Number(affected),
      severity: Number(severity),
      urgency_score: Math.min(100, Number(severity) * 18 + 10),
    });
    setSiteName('');
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehName) return;
    await onAddVehicle({
      name: vehName,
      capacity: Number(capacity),
    });
    setVehName('');
  };

  return (
    <div className="p-3 bg-slate-900/90 border border-slate-800/90 rounded-2xl flex flex-col gap-2.5 flex-shrink-0">
      <div className="flex gap-1 p-1 bg-[#030712] rounded-xl border border-slate-800/80">
        <button
          type="button"
          onClick={() => setActiveTab('sites')}
          className={`flex-1 py-1 text-[11px] font-extrabold uppercase tracking-wider rounded-lg transition-all ${
            activeTab === 'sites' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Add Incident
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('vehicles')}
          className={`flex-1 py-1 text-[11px] font-extrabold uppercase tracking-wider rounded-lg transition-all ${
            activeTab === 'vehicles' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Add Vehicle
        </button>
      </div>

      {activeTab === 'sites' ? (
        <form onSubmit={handleCreateSite} className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Incident name..."
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#030712] border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500/50"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            <select
              value={resource}
              onChange={(e) => setResource(e.target.value)}
              className="px-2 py-1 bg-[#030712] border border-slate-800 rounded-lg text-[11px] text-slate-200 focus:outline-none"
            >
              <option value="water">Water</option>
              <option value="medical">Medical</option>
              <option value="food">Food</option>
              <option value="generators">Generators</option>
              <option value="shelter">Shelter</option>
            </select>

            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="px-2 py-1 bg-[#030712] border border-slate-800 rounded-lg text-[11px] text-slate-200 focus:outline-none"
            />

            <input
              type="number"
              placeholder="Sev (1-5)"
              value={severity}
              onChange={(e) => setSeverity(Number(e.target.value))}
              min={1}
              max={5}
              className="px-2 py-1 bg-[#030712] border border-slate-800 rounded-lg text-[11px] text-slate-200 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Disaster Site</span>
          </button>
        </form>
      ) : (
        <form onSubmit={handleCreateVehicle} className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Vehicle name..."
            value={vehName}
            onChange={(e) => setVehName(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#030712] border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
          />
          <input
            type="number"
            placeholder="Capacity (units)"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className="w-full px-3 py-1.5 bg-[#030712] border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
          />
          <button
            type="submit"
            className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Vehicle</span>
          </button>
        </form>
      )}
    </div>
  );
}
