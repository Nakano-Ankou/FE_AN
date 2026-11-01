import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  ApiError,
  AuthenticationRequest,
  RoleInput,
  TagResponse,
  UserResponse,
  UserTagResponse,
} from '../types';
import * as authService from '../services/authService';

export type AuthStatus = 'IDLE' | 'INITIALIZING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

interface UserState {
  authStatus: AuthStatus;
  token: string | null;
  currentUser: UserResponse | null;
  myTags: UserTagResponse[] | TagResponse[];
  sessionError: string | null;
  login: (request: AuthenticationRequest) => Promise<void>;
  initializeSession: () => Promise<void>;
  logout: () => void;
}

let initializationPromise: Promise<void> | null = null;

function isUnauthorized(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'code' in error &&
    (error as ApiError).status === 401 &&
    (error as ApiError).code !== 1006
  );
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return 'Không thể xác minh phiên đăng nhập. Vui lòng thử lại.';
}

function clearSession(set: (partial: Partial<UserState>) => void, status: AuthStatus): void {
  set({
    authStatus: status,
    token: null,
    currentUser: null,
    myTags: [],
    sessionError: null,
  });
}

function hasAdminRole(roles: RoleInput[] | undefined): boolean {
  return roles?.some((role) => role === 'ROLE_ADMIN' || role === 'ADMIN') ?? false;
}

export function isAdminUser(user: UserResponse | null): boolean {
  return hasAdminRole(user?.roles);
}

export function canAccessUserArea(user: UserResponse | null): boolean {
  return (
    isAdminUser(user) ||
    (user?.roles.some((role) => role === 'ROLE_USER' || role === 'USER') ?? false)
  );
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      authStatus: 'IDLE',
      token: null,
      currentUser: null,
      myTags: [],
      sessionError: null,

      login: async (request) => {
        set({ authStatus: 'UNAUTHENTICATED', sessionError: null });
        try {
          const result = await authService.login(request);
          if (!result.authenticated || !result.token) {
            throw new Error('Tên đăng nhập hoặc mật khẩu không chính xác.');
          }

          set({ token: result.token });
          const [currentUser, myTags] = await Promise.all([
            authService.getCurrentUser(),
            authService.getMyTags(),
          ]);
          set({
            authStatus: 'AUTHENTICATED',
            currentUser,
            myTags,
            sessionError: null,
          });
        } catch (error) {
          clearSession(set, 'UNAUTHENTICATED');
          throw error;
        }
      },

      initializeSession: () => {
        if (initializationPromise) return initializationPromise;
        if (get().authStatus === 'AUTHENTICATED') return Promise.resolve();

        initializationPromise = (async () => {
          const token = get().token;
          if (!token) {
            clearSession(set, 'UNAUTHENTICATED');
            return;
          }

          set({ authStatus: 'INITIALIZING', sessionError: null });
          try {
            const result = await authService.introspect(token);
            if (!result.valid) {
              clearSession(set, 'UNAUTHENTICATED');
              return;
            }

            const [currentUser, myTags] = await Promise.all([
              authService.getCurrentUser(),
              authService.getMyTags(),
            ]);
            set({
              authStatus: 'AUTHENTICATED',
              currentUser,
              myTags,
              sessionError: null,
            });
          } catch (error) {
            if (isUnauthorized(error)) {
              clearSession(set, 'UNAUTHENTICATED');
            } else {
              set({ sessionError: getErrorMessage(error) });
            }
          }
        })().finally(() => {
          initializationPromise = null;
        });

        return initializationPromise;
      },

      logout: () => clearSession(set, 'UNAUTHENTICATED'),
    }),
    {
      name: 'hnag-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        currentUser: state.currentUser,
      }),
    },
  ),
);
