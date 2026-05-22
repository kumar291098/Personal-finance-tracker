import { apiClient } from './client';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  currency: string;
  accessLevel: string;
  subscriberUntil: string;
  allowedPages: string[];
}

export const getProfile = async (): Promise<UserProfile> => {
  return await apiClient('/profile');
};

export const updateProfile = async (data: Partial<Omit<UserProfile, 'id' | 'accessLevel' | 'allowedPages' | 'subscriberUntil'>>): Promise<UserProfile & { token?: string; message?: string }> => {
  return await apiClient('/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const changePassword = async (data: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ success: boolean; message: string }> => {
  return await apiClient('/profile/password', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const deleteAccount = async (password: string): Promise<{ success: boolean; message: string }> => {
  return await apiClient('/profile', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });
};
