import { API_URL } from './config';
import { getToken } from './client';

export interface HealthResponse {
  status: string;
  components?: {
    db?: {
      status?: string;
    };
  };
}

export interface MetricMeasurement {
  statistic: string;
  value: number;
}

export interface MetricResponse {
  name: string;
  measurements: MetricMeasurement[];
}

const fetchMonitoring = async (path: string, requireAuth = false) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (requireAuth) {
    const token = await getToken();
    if (!token) {
      throw new Error('Please log in again to view monitoring data.');
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, { headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response.json();
};

export const getHealth = async (): Promise<HealthResponse> => {
  return fetchMonitoring('/actuator/health');
};

export const getMetric = async (
  name: string,
  tags: string[] = []
): Promise<MetricResponse> => {
  const query = tags.length
    ? `?${tags.map(tag => `tag=${encodeURIComponent(tag)}`).join('&')}`
    : '';

  return fetchMonitoring(`/actuator/metrics/${name}${query}`, true);
};
