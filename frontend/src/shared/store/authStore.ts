import { create } from "zustand";

type AuthState = {
  token: string | null;
  redirectAfterLogin: string | null;
  setToken: (token: string | null) => void;
  setRedirectAfterLogin: (path: string | null) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("token"),
  redirectAfterLogin: null,
  setToken: (token) => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
    set({ token });
  },
  setRedirectAfterLogin: (path) => set({ redirectAfterLogin: path }),
  logout: () => {
    localStorage.removeItem("token");
    set({ token: null, redirectAfterLogin: null });
  },
}));
