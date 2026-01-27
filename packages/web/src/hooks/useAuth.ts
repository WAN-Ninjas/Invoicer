import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/services/api';
import { useNavigate } from 'react-router-dom';

export function useAuth() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: authState, isLoading } = useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      const response = await authApi.check();
      return response.data;
    },
    retry: false,
    staleTime: 5000, // Prevent excessive refetching
  });

  const loginMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await authApi.login(password);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      // Navigation handled by the calling component
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await authApi.logout();
      return response.data;
    },
    onSuccess: () => {
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });

  const login = useCallback(
    (password: string) => loginMutation.mutateAsync(password),
    [loginMutation.mutateAsync]
  );

  const logout = useCallback(
    () => logoutMutation.mutateAsync(),
    [logoutMutation.mutateAsync]
  );

  return {
    isAuthenticated: authState?.authenticated ?? false,
    passwordRequired: authState?.passwordRequired ?? true,
    isLoading,
    login,
    logout,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
  };
}
