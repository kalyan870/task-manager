import { createContext, useContext, useMemo } from 'react';
import { useAuth as useClerkAuth, useClerk, useUser } from '@clerk/react';

const AuthContext = createContext(null);
const API = '/api';

export function AuthProvider({ children }) {
  const auth = useClerkAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const { signOut } = useClerk();
  const value = useMemo(() => ({
    user,
    loading: !auth.isLoaded || !userLoaded,
    getToken: auth.getToken,
    logout: () => signOut(),
  }), [auth.isLoaded, auth.getToken, signOut, user, userLoaded]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuthContext = () => useContext(AuthContext);
export const useAuth = useAuthContext;
export const API_URL = API;
