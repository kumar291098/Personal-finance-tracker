import { apiClient } from './client';

export type AccessLevel = 'ADMIN' | 'SUBSCRIBER' | 'FREE';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  phone: string;
  accessLevel: AccessLevel;
  subscriberUntil: string;
}

export interface SubscriptionSettings {
  amountPaise: number;
  upiId: string;
  upiQrImageUrl: string;
  updatedAt: string;
}

export interface SubscriptionRequest {
  id: number;
  username: string;
  email: string;
  reference: string;
  amountPaise: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface AccessPolicy {
  accessLevel: AccessLevel;
  allowedPages: string[];
}

export interface AccessPolicyResponse {
  pages: string[];
  policies: AccessPolicy[];
}

export const getAdminUsers = async (): Promise<AdminUser[]> => {
  return await apiClient('/admin/users');
};

export const updateUserAccess = async (userId: number, accessLevel: AccessLevel): Promise<AdminUser> => {
  return await apiClient(`/admin/users/${userId}/access`, {
    method: 'PATCH',
    body: JSON.stringify({ accessLevel }),
  });
};

export const getSubscriptionSettings = async (): Promise<SubscriptionSettings> => {
  return await apiClient('/admin/users/subscription-settings');
};

export const updateSubscriptionSettings = async (settings: {
  amountPaise: number;
  upiId: string;
  upiQrImageUrl: string;
}): Promise<SubscriptionSettings> => {
  return await apiClient('/admin/users/subscription-settings', {
    method: 'PATCH',
    body: JSON.stringify(settings),
  });
};

export const getSubscriptionRequests = async (): Promise<SubscriptionRequest[]> => {
  return await apiClient('/admin/users/subscription-requests');
};

export const reviewSubscriptionRequest = async (
  requestId: number,
  action: 'approve' | 'reject'
): Promise<SubscriptionRequest> => {
  return await apiClient(`/admin/users/subscription-requests/${requestId}/${action}`, {
    method: 'PATCH',
  });
};

export const getAccessPolicies = async (): Promise<AccessPolicyResponse> => {
  return await apiClient('/admin/access-policies');
};

export const updateAccessPolicy = async (
  accessLevel: Exclude<AccessLevel, 'ADMIN'>,
  allowedPages: string[]
): Promise<AccessPolicy> => {
  return await apiClient(`/admin/access-policies/${accessLevel}`, {
    method: 'PATCH',
    body: JSON.stringify({ allowedPages }),
  });
};
