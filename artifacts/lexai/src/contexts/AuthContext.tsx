import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { User } from "@workspace/api-client-react/src/generated/api.schemas";
import { useGetCurrentUser } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null | undefined;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const { data: currentUser, isLoading } = useGetCurrentUser({
    query: {
      retry: false,
    }
  });

  useEffect(() => {
    if (!isLoading) {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
    }
  }, [currentUser, isLoading]);

  const login = (newUser: User) => {
    setUser(newUser);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
