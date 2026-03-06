import { useAuthStore } from "../store/authStore";

export function useAuth() {
  const token = useAuthStore((state) => state.token);
  const setToken = useAuthStore((state) => state.setToken);
  const logout = useAuthStore((state) => state.logout);
  const redirectAfterLogin = useAuthStore((state) => state.redirectAfterLogin);
  const setRedirectAfterLogin = useAuthStore((state) => state.setRedirectAfterLogin);

  return {
    isAuthed: Boolean(token),
    token,
    setToken,
    logout,
    redirectAfterLogin,
    setRedirectAfterLogin,
  };
}
