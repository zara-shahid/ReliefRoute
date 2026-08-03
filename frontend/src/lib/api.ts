import axios from 'axios';
import { Site, Vehicle, Route } from '@/types';

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
    return '/api';
  }
  return 'http://127.0.0.1:8000/api';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const getSites = async (): Promise<Site[]> => {
  const response = await api.get('/sites/');
  return response.data;
};

export const getVehicles = async (): Promise<Vehicle[]> => {
  const response = await api.get('/vehicles/');
  return response.data;
};

export const getRoutes = async (): Promise<Route[]> => {
  const response = await api.get('/routes/');
  return response.data;
};

export const sendDispatchChat = async (message: string): Promise<string> => {
  const response = await api.post('/agent/chat/', { message });
  return response.data.response;
};

export const optimizeRoutes = async () => {
  const response = await api.post('/optimize/');
  return response.data;
};

export const createSite = async (siteData: Partial<Site>): Promise<Site> => {
  const response = await api.post('/sites/', siteData);
  return response.data;
};

export const deleteSite = async (id: number): Promise<void> => {
  await api.delete(`/sites/${id}/`);
};

export const createVehicle = async (vehData: Partial<Vehicle>): Promise<Vehicle> => {
  const response = await api.post('/vehicles/', vehData);
  return response.data;
};
