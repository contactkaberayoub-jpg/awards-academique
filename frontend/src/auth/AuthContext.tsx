import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import { authStorage } from './authStorage';
import { authApi } from './authApi';
import { instructorApi } from '../api/instructor';
import { normalizeRole } from './roleRoutes';
import { registerUnauthorizedHandler } from '../api/client';
import type {
  AuthResponse,
  InstructorRegisterRequest,
  RegisterRequest,
  User,
} from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<User>;
  register: (payload: RegisterRequest) => Promise<User>;
  registerInstructor: (payload: InstructorRegisterRequest) => Promise<User>;
  loginWithGoogle: (code: string) => Promise<User>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

type AuthAction =
  | { type: 'BOOTSTRAP_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'BOOTSTRAP_FINISH' };

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: true,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'BOOTSTRAP_START':
      return { ...state, isLoading: true };
    case 'AUTH_SUCCESS':
      return {
        user: action.payload.user,
        token: action.payload.token,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        user: null,
        token: null,
        isLoading: false,
      };
    case 'BOOTSTRAP_FINISH':
      return { ...state, isLoading: false };
    default:
      return state;
  }
}

function mapAuthResponseToUser(response: AuthResponse): User {
  return {
    userId: response.userId,
    firstName: response.firstName,
    lastName: response.lastName,
    email: response.email,
    role: normalizeRole(response.role),
    instructorStatus: response.instructorStatus,
    emailVerified: response.emailVerified,
    oauthProvider: response.oauthProvider,
  };
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const clearSession = useCallback(() => {
    authStorage.clear();
    dispatch({ type: 'LOGOUT' });
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      dispatch({ type: 'BOOTSTRAP_START' });

      const storedToken = authStorage.getToken();
      const storedUser = authStorage.getUser();

      if (!storedToken || !storedUser) {
        dispatch({ type: 'BOOTSTRAP_FINISH' });
        return;
      }

      try {
        const response = await authApi.me();
        if (response.data.email === storedUser.email) {
          const payload = { user: storedUser, token: storedToken };
          dispatch({
            type: 'AUTH_SUCCESS',
            payload,
          });
          return;
        }
        clearSession();
      } catch {
        clearSession();
      }

      dispatch({ type: 'BOOTSTRAP_FINISH' });
    };

    void bootstrap();
  }, [clearSession]);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      clearSession();
      if (!window.location.pathname.startsWith('/login')) {
        const next = encodeURIComponent(
          `${window.location.pathname}${window.location.search}`
        );
        window.location.replace(`/login?redirect=${next}`);
      }
    });

    return () => registerUnauthorizedHandler(null);
  }, [clearSession]);

  const persistSession = useCallback(
    (response: AuthResponse, remember = true) => {
      const user = mapAuthResponseToUser(response);
      authStorage.setToken(response.token, remember);
      authStorage.setUser(user, remember);
      const payload = { user, token: response.token };
      dispatch({
        type: 'AUTH_SUCCESS',
        payload,
      });
      return user;
    },
    []
  );

  const login = useCallback(
    async (email: string, password: string, remember = true) => {
      const response = await authApi.login({ email, password });
      return persistSession(response.data, remember);
    },
    [persistSession]
  );

  const register = useCallback(
    async (payload: RegisterRequest) => {
      const response = await authApi.register(payload);
      return persistSession(response.data);
    },
    [persistSession]
  );

  const registerInstructor = useCallback(
    async (payload: InstructorRegisterRequest) => {
      const response = await instructorApi.register(payload);
      return persistSession(response.data);
    },
    [persistSession]
  );

  const loginWithGoogle = useCallback(
    async (code: string) => {
      const response = await authApi.exchangeGoogleCode(code);
      return persistSession(response.data);
    },
    [persistSession]
  );

  const refreshUser = useCallback(async () => {
    const response = await authApi.me();
    const currentToken = authStorage.getToken();
    const user = mapAuthResponseToUser(response.data);
    const remember = Boolean(window.localStorage.getItem('auth_token'));
    authStorage.setUser(user, remember);
    if (currentToken) {
      dispatch({ type: 'AUTH_SUCCESS', payload: { user, token: currentToken } });
    }
  }, []);

  const logout = useCallback(() => {
    clearSession();
    window.location.replace('/login');
  }, [clearSession]);

  const value = useMemo<AuthContextType>(
    () => ({
      user: state.user,
      token: state.token,
      isAuthenticated: Boolean(state.user && state.token),
      isLoading: state.isLoading,
      login,
      register,
      registerInstructor,
      loginWithGoogle,
      refreshUser,
      logout,
    }),
    [
      login,
      logout,
      loginWithGoogle,
      refreshUser,
      register,
      registerInstructor,
      state.isLoading,
      state.token,
      state.user,
    ]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
