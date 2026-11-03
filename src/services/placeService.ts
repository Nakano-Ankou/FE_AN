import type { PlaceFilterParams, PlaceResponse } from '../types';
import { apiGet } from './apiClient';

export function getPlaces(params: PlaceFilterParams = {}): Promise<PlaceResponse[]> {
  return apiGet<PlaceResponse[]>('/api/v1/places', { params });
}

export function getPlace(placeId: string): Promise<PlaceResponse> {
  return apiGet<PlaceResponse>(`/api/v1/places/${placeId}`);
}
