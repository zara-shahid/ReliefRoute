export type SeverityLevel = 1 | 2 | 3 | 4 | 5;

export type ResourceType = 'water' | 'medical' | 'food' | 'shelter' | 'generators' | 'rescue_gear';

export interface LocationCoords {
  lat: number;
  lng: number;
}

export interface DisasterSite {
  id: string;
  name: string;
  locationName: string;
  coords: LocationCoords;
  resourceNeeded: ResourceType;
  amountNeeded: number; // in units (e.g., packages, kg, liters)
  peopleAffected: number;
  severity: SeverityLevel;
  reportedAt: string; // ISO string
  urgencyWindowHours: number; // max hours to fulfill
  urgencyScore: number; // calculated 0-100
  status: 'pending' | 'allocated' | 'in_transit' | 'fulfilled';
  description: string;
}

export interface Vehicle {
  id: string;
  name: string;
  type: 'heavy_truck' | 'rapid_van' | 'medical_heli' | 'supply_truck';
  capacity: number; // max units of resources
  maxSpeedKmh: number;
  depotCoords: LocationCoords;
  depotName: string;
  status: 'available' | 'dispatched' | 'maintenance';
  driverName?: string;
}

export interface RouteStop {
  stopOrder: number; // 1-indexed
  siteId: string;
  siteName: string;
  coords: LocationCoords;
  resourceDelivered: ResourceType;
  amountDelivered: number;
  estimatedArrivalTimeMin: number;
  urgencyScore: number;
  isDepot?: boolean;
}

export interface VehicleRoute {
  vehicleId: string;
  vehicleName: string;
  driverName: string;
  vehicleType: Vehicle['type'];
  capacity: number;
  loadUsed: number;
  loadPercentage: number;
  totalDistanceKm: number;
  totalTimeMinutes: number;
  stops: RouteStop[];
  driverInstructions: string[];
}

export interface OptimizationMetrics {
  totalDistanceKm: number;
  totalTimeMinutes: number;
  sitesFulfilledCount: number;
  totalSitesCount: number;
  averageUrgencyServed: number;
  naiveDistanceKm: number;
  naiveTimeMinutes: number;
  distanceSavedPercent: number;
  timeSavedPercent: number;
  solverExecutionTimeMs: number;
}

export interface OptimizationResult {
  timestamp: string;
  routes: VehicleRoute[];
  unassignedSiteIds: string[];
  metrics: OptimizationMetrics;
}

export interface AgentStepLog {
  id: string;
  agentName: 'Intake Agent' | 'Prioritization Agent' | 'Routing Solver' | 'Dispatch Agent';
  status: 'idle' | 'running' | 'success' | 'failed';
  timestamp: string;
  summary: string;
  details?: Record<string, any>;
  durationMs?: number;
}

export interface AgentPipelineRun {
  runId: string;
  rawReport: string;
  createdSite?: DisasterSite;
  urgencyAnalysis?: {
    urgencyScore: number;
    windowHours: number;
    reasoning: string;
  };
  optimizationResult?: OptimizationResult;
  dispatchManifests?: Record<string, string[]>;
  stepLogs: AgentStepLog[];
  status: 'in_progress' | 'completed' | 'failed';
  error?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'dispatch_agent';
  text: string;
  timestamp: string;
  contextRouteId?: string;
}

export interface DemoReport {
  id: string;
  title: string;
  rawText: string;
  category: string;
  urgencyBadge: 'Critical' | 'High' | 'Medium';
}
