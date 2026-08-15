import apiClient from './apiClient';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface ChatResponse {
  reply: string;
  model: string;
}

export interface ChatContext {
  vitals?: Record<string, any> | null;
  health_profile?: Record<string, any> | null;
}

class ChatService {
  async sendMessage(
    message: string,
    history?: ChatMessage[],
    language: string = 'vi',
    context?: ChatContext,
  ): Promise<ChatResponse> {
    const response = await apiClient.post<ChatResponse>('/chat/message', {
      message,
      history: history || [],
      language,
      vitals:         context?.vitals        ?? null,
      health_profile: context?.health_profile ?? null,
    });
    return response.data;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await apiClient.get('/chat/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

export default new ChatService();
