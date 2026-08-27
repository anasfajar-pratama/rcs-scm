import { api, TOKEN_KEY } from './client';
import type { AuthResponse, User } from '../types';

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<{ success: boolean; message: string; data: AuthResponse }>('/auth/login', { email, password });
  return data.data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function me(): Promise<User> {
  const { data } = await api.get<{ data: User }>('/auth/me');
  return data.data;
}

export { TOKEN_KEY };
