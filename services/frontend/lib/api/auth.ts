/**
 * Authentication API
 */

import { apiClient } from './client';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isAdmin?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export const authApi = {
  async login(credentials: LoginCredentials) {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    if (response.success && response.data) {
      apiClient.setToken(response.data.token);
    }
    return response;
  },

  async register(data: RegisterData) {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    if (response.success && response.data) {
      apiClient.setToken(response.data.token);
    }
    return response;
  },

  async getProfile() {
    return apiClient.get<User>('/users/profile');
  },

  async updateProfile(data: Partial<User>) {
    return apiClient.put<User>('/users/profile', data);
  },

  logout() {
    apiClient.setToken(null);
  },
};

