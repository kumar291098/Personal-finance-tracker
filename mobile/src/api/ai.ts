import { apiClient } from './client';

export interface AiChatResponse {
  reply: string;
}

export const sendAiChatMessage = async (message: string): Promise<AiChatResponse> => {
  return await apiClient('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
};
