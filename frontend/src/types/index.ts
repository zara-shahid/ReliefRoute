export interface Site {
  id: number;
  name: string;
  location_name?: string;
  lat: number;
  lng: number;
  resource_needed: string;
  resource_type?: string;
  amount_needed?: number;
  people_affected: number;
  severity: number;
  urgency_window_hours?: number;
  urgency_score: number;
  status?: string;
}

export interface Vehicle {
  id: number;
  name: string;
  capacity: number;
}

export interface RouteStop {
  stopOrder: number;
  siteId: number | null;
  siteName: string;
  coords?: {
    lat: number;
    lng: number;
  };
  resourceDelivered?: string;
  amountDelivered?: number;
  estimatedArrivalTimeMin: number;
  urgencyScore?: number;
}

export interface Route {
  id: number;
  vehicle: Vehicle;
  vehicle_name?: string;
  driver_name?: string;
  total_distance_km?: number;
  total_time_minutes?: number;
  stops: RouteStop[];
  roadGeometry?: { lat: number; lng: number }[];
  created_at: string;
}
