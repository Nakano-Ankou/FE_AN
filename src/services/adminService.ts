import type {
  PlaceCreationRequest,
  PlaceResponse,
  PlaceUpdateRequest,
  TagRequest,
  TagResponse,
  UserResponse,
  UserUpdateRequest,
} from '../types';
import { apiDelete, apiGet, apiPost, apiPut } from './apiClient';

export function getAdminUsers(): Promise<UserResponse[]> {
  return apiGet<UserResponse[]>('/api/v1/users');
}

export function updateAdminUser(
  userId: string,
  request: UserUpdateRequest,
): Promise<UserResponse> {
  return apiPut<UserResponse, UserUpdateRequest>(`/api/v1/users/${userId}`, request);
}

export function deleteAdminUser(userId: string): Promise<string> {
  return apiDelete<string>(`/api/v1/users/${userId}`);
}

export function getAdminPlaces(): Promise<PlaceResponse[]> {
  return apiGet<PlaceResponse[]>('/api/v1/places');
}

export function createAdminPlace(request: PlaceCreationRequest): Promise<PlaceResponse> {
  return apiPost<PlaceResponse, PlaceCreationRequest>('/api/v1/places', request);
}

export function updateAdminPlace(
  placeId: string,
  request: PlaceUpdateRequest,
): Promise<PlaceResponse> {
  return apiPut<PlaceResponse, PlaceUpdateRequest>(`/api/v1/places/${placeId}`, request);
}

export function deleteAdminPlace(placeId: string): Promise<string> {
  return apiDelete<string>(`/api/v1/places/${placeId}`);
}

export function getAdminTags(): Promise<TagResponse[]> {
  return apiGet<TagResponse[]>('/api/v1/tags');
}

export function createAdminTag(request: TagRequest): Promise<TagResponse> {
  return apiPost<TagResponse, TagRequest>('/api/v1/tags', request);
}

export function updateAdminTag(tagId: string, request: TagRequest): Promise<TagResponse> {
  return apiPut<TagResponse, TagRequest>(`/api/v1/tags/${tagId}`, request);
}

export function deleteAdminTag(tagId: string): Promise<string> {
  return apiDelete<string>(`/api/v1/tags/${tagId}`);
}
