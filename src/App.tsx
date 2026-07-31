import React, { useState, useEffect } from 'react';
import { DisasterSite, Vehicle, OptimizationResult, AgentPipelineRun, ChatMessage, DemoReport } from './types';
import { Navbar } from './components/Navbar';
import { MapContainer } from './components/MapContainer';
import { VehicleSimulator, SimulatedVehicleState } from './components/VehicleSimulator';
import { AgentPipelineTracker } from './components/AgentPipelineTracker';
import { ReportIntakePanel } from './components/ReportIntakePanel';
import { RouteOverviewPanel } from './components/RouteOverviewPanel';
import { DispatchChat } from './components/DispatchChat';
import { FleetAndSitesManager } from './components/FleetAndSitesManager';

export default function App() {
  const [sites, setSites] = useState<DisasterSite[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [demoReports, setDemoReports] = useState<DemoReport[]>([]);
  const [pipelineRun, setPipelineRun] = useState<AgentPipelineRun | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [selectedSite, setSelectedSite] = useState<DisasterSite | null>(null);
  const [simulatedVehicles, setSimulatedVehicles] = useState<SimulatedVehicleState[]>([]);

  // Loading States
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isRunningPipeline, setIsRunningPipeline] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Fetch Initial Application Data
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [sitesRes, vehiclesRes, demoRes] = await Promise.all([
        fetch('/api/sites').then((r) => r.json()),
        fetch('/api/vehicles').then((r) => r.json()),
        fetch('/api/demo-reports').then((r) => r.json()),
      ]);

      if (sitesRes.sites) setSites(sitesRes.sites);
      if (vehiclesRes.vehicles) setVehicles(vehiclesRes.vehicles);
      if (demoRes.demoReports) setDemoReports(demoRes.demoReports);

      // Trigger initial solver
      runOptimization();
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  };

  // Trigger OR VRP Route Solver
  const runOptimization = async () => {
    setIsOptimizing(true);
    try {
      const res = await fetch('/api/optimize', { method: 'POST' });
      const data = await res.json();
      if (data.optimization) {
        setOptimization(data.optimization);
      }
    } catch (err) {
      console.error('Error running optimization:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Run End-to-End Multi-Agent Pipeline
  const handleRunAgentPipeline = async (rawReportText: string) => {
    setIsRunningPipeline(true);
    try {
      const res = await fetch('/api/agent/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawReport: rawReportText }),
      });
      const data = await res.json();

      if (data.pipelineRun) {
        setPipelineRun(data.pipelineRun);
      }
      if (data.sites) setSites(data.sites);
      if (data.currentOptimization) setOptimization(data.currentOptimization);
    } catch (err) {
      console.error('Error executing agent pipeline:', err);
    } finally {
      setIsRunningPipeline(false);
    }
  };

  // Dispatch Chat AI Q&A
  const handleSendMessage = async (question: string) => {
    setIsSendingChat(true);
    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (data.chatHistory) setChatHistory(data.chatHistory);
    } catch (err) {
      console.error('Error in dispatch chat:', err);
    } finally {
      setIsSendingChat(false);
    }
  };

  // Add Custom Disaster Site
  const handleAddSite = async (siteData: Partial<DisasterSite>) => {
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(siteData),
      });
      const data = await res.json();
      if (data.sites) setSites(data.sites);
      if (data.currentOptimization) setOptimization(data.currentOptimization);
    } catch (err) {
      console.error('Error adding site:', err);
    }
  };

  // Delete Site
  const handleDeleteSite = async (id: string) => {
    try {
      const res = await fetch(`/api/sites/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.sites) setSites(data.sites);
      if (data.currentOptimization) setOptimization(data.currentOptimization);
    } catch (err) {
      console.error('Error deleting site:', err);
    }
  };

  // Reset Data
  const handleResetData = async () => {
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      const data = await res.json();
      if (data.sites) setSites(data.sites);
      if (data.vehicles) setVehicles(data.vehicles);
      if (data.currentOptimization) setOptimization(data.currentOptimization);
      setPipelineRun(null);
      setChatHistory([]);
    } catch (err) {
      console.error('Error resetting data:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      
      {/* Top Navbar */}
      <Navbar
        metrics={optimization?.metrics}
        sitesCount={sites.length}
        vehiclesCount={vehicles.length}
        isOptimizing={isOptimizing}
        onRunOptimization={runOptimization}
        onOpenDemoModal={() => {
          if (demoReports.length > 0) {
            handleRunAgentPipeline(demoReports[0].rawText);
          }
        }}
        onResetData={handleResetData}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Row 1: Report Intake & Multi-Agent Pipeline Tracker */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <ReportIntakePanel
              demoReports={demoReports}
              onSubmitReport={handleRunAgentPipeline}
              isRunningPipeline={isRunningPipeline}
            />
          </div>

          <div className="lg:col-span-7">
            <AgentPipelineTracker
              pipelineRun={pipelineRun}
              isRunning={isRunningPipeline}
            />
          </div>
        </div>

        {/* Row 2: Live Interactive Map & Dispatch Assistant Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <VehicleSimulator
              routes={optimization?.routes || []}
              depotCoords={{ lat: 37.7749, lng: -122.4194 }}
              onUpdateSimulatedVehicles={setSimulatedVehicles}
            />

            <MapContainer
              sites={sites}
              routes={optimization?.routes || []}
              depotCoords={{ lat: 37.7749, lng: -122.4194 }}
              selectedSiteId={selectedSite?.id}
              onSelectSite={setSelectedSite}
              simulatedVehicles={simulatedVehicles}
            />
          </div>

          <div className="lg:col-span-5">
            <DispatchChat
              chatHistory={chatHistory}
              onSendMessage={handleSendMessage}
              isSending={isSendingChat}
            />
          </div>
        </div>

        {/* Row 3: Dispatched Vehicle Routes & Fleet/Sites Manager */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <RouteOverviewPanel optimization={optimization} />
          </div>

          <div className="lg:col-span-5">
            <FleetAndSitesManager
              sites={sites}
              vehicles={vehicles}
              onAddSite={handleAddSite}
              onDeleteSite={handleDeleteSite}
              onAddVehicle={() => {}}
            />
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ReliefRoute • Operations Research & Agentic Disaster Relief System</span>
          <span>Orion Global Hackathon 2026</span>
        </div>
      </footer>

    </div>
  );
}
