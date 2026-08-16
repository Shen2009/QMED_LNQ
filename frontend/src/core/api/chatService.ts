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

// Product-evaluation mode: answer supported health questions locally so the
// chatbot remains immediate and deterministic on machines without AI compute.
const LOCAL_CHAT_MODE = true;

const normalizeQuestion = (value: string) => value
  .toLocaleLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/[^a-z0-9\s/]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const localReply = (message: string, language: string): string => {
  const question = normalizeQuestion(message);
  const english = language === 'en';

  if (/nhip tim|heart rate|bpm|mach/.test(question)) {
    return english
      ? '**Resting heart rate:** For most adults, 60–100 BPM is a commonly used reference range. Q-Med demo results of 68–84 BPM fall within that range. Rest for five minutes before measuring. Seek medical care if an unusual rate persists or comes with chest pain, fainting, or shortness of breath.'
      : '**Nhịp tim khi nghỉ:** 60–100 BPM là khoảng tham khảo thường dùng cho đa số người trưởng thành. Các kết quả demo của Q-Med từ 68–84 BPM nằm trong khoảng này. Bạn nên nghỉ yên 5 phút trước khi đo; hãy đi khám nếu nhịp bất thường kéo dài hoặc kèm đau ngực, ngất, khó thở.';
  }

  if (/stress|cang thang|lo au|anxiety|thu gian/.test(question)) {
    return english
      ? '**To reduce stress:** breathe slowly for 3–5 minutes, take a short walk, limit caffeine, and keep a regular sleep schedule. A Q-Med score below 40 is low, 40–60 is moderate, and above 60 suggests you should rest and monitor yourself. Seek professional support if distress persists or affects daily life.'
      : '**Để giảm căng thẳng:** thở chậm 3–5 phút, đi bộ nhẹ, hạn chế caffeine và ngủ đúng giờ. Trong bản demo Q-Med, dưới 40 là thấp, 40–60 là trung bình, trên 60 là mức nên nghỉ ngơi và theo dõi thêm. Nếu căng thẳng kéo dài hoặc ảnh hưởng sinh hoạt, bạn nên trao đổi với chuyên gia.';
  }

  if (/huyet ap|blood pressure|mmhg|tam thu|tam truong/.test(question)) {
    return english
      ? '**Blood pressure:** Below 120/80 mmHg is generally considered normal for adults. Q-Med demo profiles are 116/75, 125/81, and 136/88 mmHg. One camera estimate cannot diagnose hypertension; repeat measurements at rest and consult a clinician if readings remain high.'
      : '**Huyết áp:** dưới 120/80 mmHg thường được xem là mức bình thường ở người trưởng thành. Ba hồ sơ demo Q-Med là 116/75, 125/81 và 136/88 mmHg. Một lần ước tính bằng camera không dùng để chẩn đoán tăng huyết áp; hãy đo lại khi nghỉ ngơi và đi khám nếu kết quả cao lặp lại.';
  }

  if (/tong quat|suc khoe|ket qua|overall|general health|health result/.test(question)) {
    return english
      ? '**Overall assessment:** Q-Med combines heart rate, HRV, stress, and estimated blood pressure. Green values suggest continued healthy habits; yellow values should be rechecked; red or persistent abnormal values should be discussed with a clinician. These demo estimates do not replace a medical examination.'
      : '**Đánh giá tổng quát:** Q-Med tổng hợp nhịp tim, HRV, stress và huyết áp ước tính. Chỉ số xanh nên tiếp tục duy trì thói quen tốt; chỉ số vàng nên đo lại; chỉ số đỏ hoặc bất thường kéo dài nên trao đổi với bác sĩ. Kết quả demo không thay thế khám và chẩn đoán y khoa.';
  }

  if (/xin chao|chao|hello|hi|hey/.test(question)) {
    return english
      ? 'Hello! I can quickly answer preset questions about **heart rate, blood pressure, stress, and overall health results**. Choose a suggestion below or type one of those topics.'
      : 'Xin chào! Tôi có thể trả lời nhanh các câu hỏi có sẵn về **nhịp tim, huyết áp, stress và kết quả khám tổng quát**. Bạn hãy chọn gợi ý bên dưới hoặc nhập một trong các chủ đề này.';
  }

  return english
    ? 'In this demo I currently support four topics: **heart rate, blood pressure, reducing stress, and overall health results**. Please choose one of the suggested questions so I can answer immediately.'
    : 'Trong bản demo, tôi đang hỗ trợ bốn chủ đề: **nhịp tim, huyết áp, giảm căng thẳng và kết quả khám tổng quát**. Bạn hãy chọn một câu hỏi gợi ý để nhận câu trả lời ngay.';
};

class ChatService {
  async sendMessage(
    message: string,
    history?: ChatMessage[],
    language: string = 'vi',
    context?: ChatContext,
  ): Promise<ChatResponse> {
    if (LOCAL_CHAT_MODE) {
      await new Promise(resolve => setTimeout(resolve, 650));
      return {reply: localReply(message, language), model: 'qmed-local-preset'};
    }

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
    if (LOCAL_CHAT_MODE) return true;
    try {
      const response = await apiClient.get('/chat/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

export default new ChatService();
