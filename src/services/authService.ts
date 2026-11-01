import type {
  AuthenticationRequest,
  AuthenticationResponse,
  IntrospectRequest,
  IntrospectResponse,
  TagResponse,
  UserCreationRequest,
  UserResponse,
  UserTagResponse,
} from '../types';
import { apiGet, apiPost } from './apiClient';

export function login(request: AuthenticationRequest): Promise<AuthenticationResponse> {
  return apiPost<AuthenticationResponse, AuthenticationRequest>('/api/v1/auth/token', request);
}

export function register(request: UserCreationRequest): Promise<UserResponse> {
  return apiPost<UserResponse, UserCreationRequest>('/api/v1/users', request);
}

export function introspect(token: string): Promise<IntrospectResponse> {
  const request: IntrospectRequest = { token };
  return apiPost<IntrospectResponse, IntrospectRequest>('/api/v1/auth/introspect', request);
}

export function getCurrentUser(): Promise<UserResponse> {
  return apiGet<UserResponse>('/api/v1/users/me');
}

export function getMyTags(): Promise<UserTagResponse[] | TagResponse[]> {
  return apiGet<UserTagResponse[] | TagResponse[]>('/api/v1/tags/user/me');
}
