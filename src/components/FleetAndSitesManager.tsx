import React, { useState } from 'react';
import { DisasterSite, Vehicle, ResourceType } from '../types';
import { MapPin, Truck, Plus, Trash2, ShieldAlert, Users, Clock, Zap, CheckCircle2 } from 'lucide-react';

interface FleetAndSitesManagerProps {
  sites: DisasterSite[];
  vehicles: Vehicle[];
  onAddSite: (site: Partial<DisasterSite>) => void;
  onDeleteSite: (id: string) => void;
  onAddVehicle: (vehicle: Partial<Vehicle>) => void;
}

export const FleetAndSitesManager: React.FC<FleetAndSitesManagerProps> = ({
  sites,
  vehicles,
  onAddSite,
  onDeleteSite,
  onAddVehicle,
}) => {
  const [activeTab, setActiveTab] = useState<'sites' | 'vehicles' | 'add_site'>('sites');

  // Form State for Adding a New Site
  const [newSiteName, setNewSiteName] = useState('');
  const [newLocationName, setNewLocationName] = useState('');
  const [newResource, setNewResource] = useState<ResourceType>('water');
  const [newAmount, setNewAmount] = useState(60);
  const [newPeople, setNewPeople] = useState(150);
  const [newSeverity, setNewSeverity] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [newDesc, setNewDesc] = useState('');

  const handleCreateSiteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName.trim()) return;

    onAddSite({
      name: newSiteName.trim(),
      locationName: newLocationName.trim() || 'Disaster Sector',
      resourceNeeded: newResource,
      amountNeeded: Number(newAmount),
      peopleAffected: Number(newPeople),
      severity: newSeverity,
      description: newDesc.trim() || 'Manual disaster site incident report.',
      status: 'pending',
    });

    setNewSiteName('');
    setNewLocationName('');
    setNewDesc('');
    setActiveTab('sites');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      
      {/* Tab Navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('sites')}
            className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'sites'
                ? 'bg-rose-600 text-white shadow'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Disaster Sites ({sites.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('vehicles')}
            className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'vehicles'
                ? 'bg-rose-600 text-white shadow'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Relief Fleet ({vehicles.length})</span>
          </button>
        </div>

        <button
          onClick={() => setActiveTab('add_site')}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-rose-400" />
          <span>Add Custom Site</span>
        </button>
      </div>

      {/* SITES TAB */}
      {activeTab === 'sites' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 pr-1">
          {sites.map((site) => (
            <div
              key={site.id}
              className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-2 hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                      {site.resourceNeeded.toUpperCase()} RELIEF
                    </span>
                    <h4 className="font-bold text-xs text-white">{site.name}</h4>
                    <p className="text-[10px] text-slate-400">{site.locationName}</p>
                  </div>

                  <button
                    onClick={() => onDeleteSite(site.id)}
                    className="text-slate-600 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                    title="Remove site"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-[11px] text-slate-300 italic line-clamp-2 mt-1.5 bg-slate-900/60 p-2 rounded border border-slate-800/80">
                  "{site.description}"
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[10px] text-slate-400">
                <span>Severity: <strong className="text-rose-400">{site.severity}/5</strong></span>
                <span>Urgency Score: <strong className="text-amber-400">{site.urgencyScore}/100</strong></span>
                <span>Amount: <strong className="text-cyan-400">{site.amountNeeded} units</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VEHICLES FLEET TAB */}
      {activeTab === 'vehicles' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {vehicles.map((v) => (
            <div key={v.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2">
                <Truck className="w-4 h-4 text-cyan-400" />
                <h4 className="font-bold text-xs text-white truncate">{v.name}</h4>
              </div>

              <div className="space-y-1 text-xs text-slate-300">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Cargo Capacity:</span>
                  <span className="font-bold text-cyan-300">{v.capacity} units</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Driver Name:</span>
                  <span className="font-medium text-slate-200">{v.driverName}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Max Speed:</span>
                  <span className="font-medium text-amber-400">{v.maxSpeedKmh} km/h</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Status:</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] uppercase font-bold">
                    {v.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD CUSTOM SITE FORM */}
      {activeTab === 'add_site' && (
        <form onSubmit={handleCreateSiteSubmit} className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
          <h4 className="font-bold text-sm text-white mb-2">Create Custom Disaster Incident Site</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Site / Facility Name</label>
              <input
                type="text"
                required
                value={newSiteName}
                onChange={(e) => setNewSiteName(e.target.value)}
                placeholder="e.g., Eastside General Hospital"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Location Address</label>
              <input
                type="text"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder="e.g., 500 Van Ness Ave, Sector 2"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Required Resource</label>
              <select
                value={newResource}
                onChange={(e) => setNewResource(e.target.value as ResourceType)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-rose-500"
              >
                <option value="water">Drinking Water</option>
                <option value="medical">Medical Trauma Kits</option>
                <option value="generators">Emergency Generators</option>
                <option value="food">Food Rations</option>
                <option value="shelter">Shelter Cots & Tarps</option>
                <option value="rescue_gear">Heavy Rescue Gear</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Resource Quantity (Units)</label>
              <input
                type="number"
                min={10}
                max={300}
                value={newAmount}
                onChange={(e) => setNewAmount(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">People Impacted</label>
              <input
                type="number"
                min={5}
                max={1000}
                value={newPeople}
                onChange={(e) => setNewPeople(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Severity Rating (1 to 5)</label>
              <select
                value={newSeverity}
                onChange={(e) => setNewSeverity(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-rose-500"
              >
                <option value={5}>5 - Life Threatening / Emergency</option>
                <option value={4}>4 - High Severity</option>
                <option value={3}>3 - Moderate Severity</option>
                <option value={2}>2 - Standard Relief</option>
                <option value={1}>1 - Low Severity</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Description / Report Context</label>
            <textarea
              rows={2}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Provide situational details..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-rose-500 resize-none"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('sites')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-medium hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-md shadow-rose-900/30"
            >
              Save Incident Site
            </button>
          </div>
        </form>
      )}

    </div>
  );
};
