import React from 'react';
import { ShieldAlert, Truck, MapPin, RefreshCw, Play, RotateCcw, Zap, Sparkles } from 'lucide-react';
import { OptimizationMetrics } from '../types';

interface NavbarProps {
  metrics?: OptimizationMetrics;
  sitesCount: number;
  vehiclesCount: number;
  isOptimizing: boolean;
  onRunOptimization: () => void;
  onOpenDemoModal: () => void;
  onResetData: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  metrics,
  sitesCount,
  vehiclesCount,
  isOptimizing,
  onRunOptimization,
  onOpenDemoModal,
  onResetData,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 flex items-center justify-center shadow-md shadow-rose-900/40 border border-rose-400/30">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                ReliefRoute
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full uppercase tracking-wider">
                OR Multi-Agent
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Disaster Relief Routing & Operations Research Optimization
            </p>
          </div>
        </div>

        {/* System Quick Stats */}
        <div className="hidden lg:flex items-center space-x-6 text-xs text-slate-300 bg-slate-950/60 px-4 py-2 rounded-xl border border-slate-800">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-rose-400" />
            <span>
              <strong className="text-white text-sm font-semibold">{sitesCount}</strong> Sites
            </span>
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center space-x-2">
            <Truck className="w-4 h-4 text-cyan-400" />
            <span>
              <strong className="text-white text-sm font-semibold">{vehiclesCount}</strong> Fleet
            </span>
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>
              Distance Saved:{' '}
              <strong className="text-emerald-400 text-sm font-semibold">
                {metrics ? `${metrics.distanceSavedPercent}%` : '0%'}
              </strong>
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={onOpenDemoModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all cursor-pointer"
            title="Select pre-scripted disaster scenario report"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Demo Script</span>
          </button>

          <button
            onClick={onRunOptimization}
            disabled={isOptimizing}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-md shadow-rose-900/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isOptimizing ? 'animate-spin' : ''}`} />
            <span>{isOptimizing ? 'Solving...' : 'Solve VRP Route'}</span>
          </button>

          <button
            onClick={onResetData}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Reset data to initial state"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
