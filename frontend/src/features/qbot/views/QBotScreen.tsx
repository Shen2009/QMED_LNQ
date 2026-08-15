import React, {useMemo, useRef, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';

import Button from '../../../shared/components/Button';
import Card from '../../../shared/components/Card';
import Screen from '../../../shared/components/Screen';
import {useTheme} from '../../../core/theme/ThemeContext';
import {localHistory} from '../../../core/storage/localHistory';

interface ChatMessage {
  id: string;
  role: 'bot' | 'user';
  text: string;
}

const initialMessages: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'bot',
    text: 'Xin chào, mình là Q-Bot bản frontend local. Mình có thể giải thích giao diện đo, lịch sử local và gợi ý bước xây tiếp.',
  },
];

const QUICK_PROMPTS = [
  'Lịch sử đo gần nhất',
  'Giải thích Face rPPG',
  'Stress là gì?',
  'Huyết áp đọc thế nào?',
  'Gợi ý demo app',
];

const formatLatestHistory = async () => {
  const history = await localHistory.latest(3);

  if (!history.length) {
    return 'Hiện chưa có lịch sử đo nào. Anh hãy vào tab Đo, chạy một flow demo rồi quay lại History.';
  }

  const rows = history
    .map((item, index) => {
      const value = `${item.primaryValue} ${item.primaryUnit || ''}`.trim();
      return `${index + 1}. ${item.type}: ${value} (${item.status})`;
    })
    .join('\n');

  return `Đây là 3 kết quả gần nhất trong AsyncStorage:\n${rows}`;
};

const buildLocalReply = async (message: string) => {
  const lower = message.toLowerCase();

  if (lower.includes('history') || lower.includes('lịch sử')) {
    return formatLatestHistory();
  }

  if (lower.includes('stress')) {
    return 'Stress screen mô phỏng quy trình đo căng thẳng: hướng dẫn người dùng ngồi yên, chạy timer, gọi backend phân tích demo, rồi lưu kết quả vào AsyncStorage.';
  }

  if (lower.includes('huyết áp') || lower.includes('blood') || lower.includes('pressure')) {
    return 'Blood Pressure screen hiển thị SYS/DIA/Pulse. Đây là giao diện frontend để trình bày flow sản phẩm, chưa phải thiết bị chẩn đoán y tế.';
  }

  if (lower.includes('tim') || lower.includes('heartbeat') || lower.includes('heart')) {
    return 'Heartbeat screen có UI microphone, waveform giả lập, timer và result screen. Sau này có thể nối thêm quyền microphone và model âm thanh tim.';
  }

  if (lower.includes('rppg') || lower.includes('camera')) {
    return 'Face rPPG dùng camera trước để quan sát thay đổi màu rất nhỏ trên da mặt, từ đó ước tính nhịp tim/HRV. Trong app hiện có camera UI, timer, gọi backend demo và màn kết quả.';
  }

  if (lower.includes('demo') || lower.includes('thuyết trình') || lower.includes('trình bày')) {
    return 'Khi demo, anh nên đi theo thứ tự: Home -> Measure -> chọn Face rPPG/Stress/Blood Pressure/Heartbeat -> Result -> History -> hỏi Q-Bot về kết quả vừa đo.';
  }

  return 'Bản Q-Bot này chạy hoàn toàn trên frontend. Anh có thể hỏi về History, Stress, Blood Pressure, Heartbeat hoặc Face rPPG.';
};

const QBotScreen = () => {
  const {theme} = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);

  const canSend = useMemo(() => input.trim().length > 0 && !thinking, [input, thinking]);

  const sendText = async (text: string) => {
    if (thinking) return;

    const cleanText = text.trim();
    if (!cleanText) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: cleanText,
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setThinking(true);

    const reply = await buildLocalReply(cleanText);
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: 'bot',
          text: reply,
        },
      ]);
      setThinking(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({animated: true}), 50);
    }, 450);
  };

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, {borderBottomColor: theme.colors.border}]}>
          <View style={[styles.avatar, {backgroundColor: theme.colors.primary + '16'}]}>
            <MaterialIcons name="smart-toy" size={28} color={theme.colors.primary} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, {color: theme.colors.text}]}>Q-Bot</Text>
            <Text style={[styles.subtitle, {color: theme.colors.textSecondary}]}>
              Frontend local assistant
            </Text>
          </View>
        </View>

        <View style={[styles.promptBand, {borderBottomColor: theme.colors.border}]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promptContent}>
            {QUICK_PROMPTS.map(prompt => (
              <TouchableOpacity
                key={prompt}
                accessibilityRole="button"
                disabled={thinking}
                onPress={() => sendText(prompt)}
                style={[
                  styles.promptChip,
                  {
                    backgroundColor: theme.colors.cardLight,
                    borderColor: theme.colors.border,
                    opacity: thinking ? 0.55 : 1,
                  },
                ]}>
                <Text style={[styles.promptText, {color: theme.colors.textSecondary}]}>
                  {prompt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}>
          {messages.map(message => {
            const isUser = message.role === 'user';
            return (
              <View
                key={message.id}
                style={[
                  styles.bubbleRow,
                  isUser ? styles.userBubbleRow : styles.botBubbleRow,
                ]}>
                <View
                  style={[
                    styles.bubble,
                    {
                      backgroundColor: isUser
                        ? theme.colors.primary
                        : theme.colors.card,
                      borderColor: isUser ? theme.colors.primary : theme.colors.border,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.bubbleText,
                      {color: isUser ? '#FFFFFF' : theme.colors.text},
                    ]}>
                    {message.text}
                  </Text>
                </View>
              </View>
            );
          })}
          {thinking ? (
            <Card style={styles.thinkingCard}>
              <Text style={[styles.thinkingText, {color: theme.colors.textSecondary}]}>
                Q-Bot đang soạn câu trả lời...
              </Text>
            </Card>
          ) : null}
        </ScrollView>

        <View style={[styles.inputBar, {borderTopColor: theme.colors.border}]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Hỏi Q-Bot..."
            placeholderTextColor={theme.colors.placeholder}
            multiline
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.cardLight,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              },
            ]}
            onSubmitEditing={() => sendText(input)}
          />
          <Button
            title="Gửi"
            icon="send"
            disabled={!canSend}
            loading={thinking}
            onPress={() => sendText(input)}
            style={styles.sendButton}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  keyboard: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {flex: 1},
  title: {fontSize: 28, fontWeight: '900'},
  subtitle: {fontSize: 13, marginTop: 2},
  promptBand: {
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  promptContent: {
    gap: 8,
    paddingHorizontal: 14,
  },
  promptChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  promptText: {fontSize: 12, fontWeight: '800'},
  messages: {flex: 1},
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 10,
  },
  bubbleRow: {flexDirection: 'row'},
  userBubbleRow: {justifyContent: 'flex-end'},
  botBubbleRow: {justifyContent: 'flex-start'},
  bubble: {
    maxWidth: '84%',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  bubbleText: {fontSize: 14, lineHeight: 20},
  thinkingCard: {alignSelf: 'flex-start', paddingVertical: 10},
  thinkingText: {fontSize: 13, fontWeight: '700'},
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 104,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
  },
  sendButton: {minWidth: 84},
});

export default QBotScreen;
