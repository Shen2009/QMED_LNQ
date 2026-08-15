import React, {useMemo, useRef, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

const buildLocalReply = async (message: string) => {
  const lower = message.toLowerCase();
  const history = await localHistory.latest(3);

  if (lower.includes('history') || lower.includes('lịch sử')) {
    return history.length
      ? `Hiện đang có ${history.length} kết quả gần nhất trong AsyncStorage. Kết quả mới nhất là ${history[0].type}: ${history[0].primaryValue} ${history[0].primaryUnit || ''}.`
      : 'Hiện chưa có lịch sử đo nào. Anh hãy vào tab Đo, chạy một flow demo rồi quay lại History.';
  }

  if (lower.includes('stress')) {
    return 'Stress screen hiện là frontend demo: có hướng dẫn, timer và kết quả mẫu. Sau này có thể thay phần kết quả bằng dữ liệu thật.';
  }

  if (lower.includes('huyết áp') || lower.includes('blood')) {
    return 'Blood Pressure screen hiện mô phỏng chỉ số SYS/DIA, timer và lưu kết quả local sau khi đo xong.';
  }

  if (lower.includes('tim') || lower.includes('heartbeat')) {
    return 'Heartbeat screen có UI microphone, waveform giả lập và result screen. Đây là nền để thêm ghi âm thật sau.';
  }

  if (lower.includes('rppg') || lower.includes('camera')) {
    return 'Face rPPG screen hiện có quyền camera, khung nhận diện mặt, timer đo và chuyển sang result screen.';
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

  const send = async () => {
    const text = input.trim();
    if (!text || thinking) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setThinking(true);

    const reply = await buildLocalReply(text);
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
            onSubmitEditing={send}
          />
          <Button
            title="Gửi"
            icon="send"
            disabled={!canSend}
            loading={thinking}
            onPress={send}
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
