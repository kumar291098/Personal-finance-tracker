import { apiClient } from './client';

export interface SubscriptionPlan {
  name: string;
  amountPaise: number;
  currency: string;
  currentAccessLevel: string;
  paymentConfigured: boolean;
  manualUpiEnabled: boolean;
  upiId: string;
  upiQrImageUrl: string;
}

export const getSubscriptionPlan = async (): Promise<SubscriptionPlan> => {
  return await apiClient('/subscription/plan');
};

export const submitManualUpiRequest = async (reference: string): Promise<any> => {
  return await apiClient('/subscription/manual-requests', {
    method: 'POST',
    body: JSON.stringify({ reference }),
  });
};

export const getAccessPolicy = async (): Promise<{ accessLevel: string; allowedPages: string[] }> => {
  return await apiClient('/access-policy/me');
};
