import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Animated,
} from 'react-native';
import {useLanguage} from '../../../core/i18n/LanguageContext';
import {MaterialIcons} from '@expo/vector-icons';
import {useColors} from '../../../core/theme/useColors';
import chatService from '../../../core/api/chatService';
import Markdown from 'react-native-markdown-display';
import historyService from '../../../core/api/historyService';
import healthProfileService from '../../../core/api/healthProfileService';

interface Message {
  id: string;
  role: 'bot' | 'user';
  text: string;
  time: string;
}

const formatTime = () => {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
};

/* ── Typing indicator: bouncing dots ── */
const TypingDots = ({color}: {color: string}) => {
  const a0 = useRef(new Animated.Value(0)).current;
  const a1 = useRef(new Animated.Value(0)).current;
  const a2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeBounce = (a: Animated.Value) =>
      Animated.sequence([
        Animated.timing(a, {toValue: 1, duration: 280, useNativeDriver: true}),
        Animated.timing(a, {toValue: 0, duration: 280, useNativeDriver: true}),
        Animated.delay(200),
      ]);
    const loop = Animated.loop(
      Animated.stagger(140, [makeBounce(a0), makeBounce(a1), makeBounce(a2)]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={typingStyles.row}>
      {([a0, a1, a2] as Animated.Value[]).map((a, i) => (
        <Animated.View
          key={i}
          style={[
            typingStyles.dot,
            {
              backgroundColor: color,
              opacity: a.interpolate({inputRange: [0, 1], outputRange: [0.35, 1]}),
              transform: [{
                translateY: a.interpolate({inputRange: [0, 0.5, 1], outputRange: [0, -7, 0]}),
              }, {
                scale: a.interpolate({inputRange: [0, 0.5, 1], outputRange: [0.85, 1.15, 0.85]}),
              }],
            },
          ]}
        />
      ))}
    </View>
  );
};

const typingStyles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 4},
  dot: {width: 8, height: 8, borderRadius: 4},
});

/* ── Animated bubble wrapper (slide-up + fade on mount) ── */
const AnimatedBubble = ({children, style}: {children: React.ReactNode; style?: object}) => {
  const slideY  = useRef(new Animated.Value(12)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideY,  {toValue: 0, tension: 80, friction: 9, useNativeDriver: true}),
      Animated.timing(opacity, {toValue: 1, duration: 200, useNativeDriver: true}),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, {opacity, transform: [{translateY: slideY}]}]}>
      {children}
    </Animated.View>
  );
};

/* ── Main screen ── */
const ChatScreen = () => {
  const {strings, language} = useLanguage();
  const C = useColors();

  const INITIAL_MESSAGES = (): Message[] => [
    {id: '1', role: 'bot', text: strings.chatGreeting1, time: '09:00'},
    {id: '2', role: 'bot', text: strings.chatGreeting2, time: '09:00'},
  ];

  const QUICK_REPLIES = [strings.chatQuick1, strings.chatQuick2, strings.chatQuick3];

  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef   = useRef<ScrollView>(null);
  const mountedRef  = useRef(false);  // FIX M2: prevent language-change reset

  // Context — fetch once on mount, silent if offline
  const contextRef = useRef<{vitals?: any; health_profile?: any}>({});
  useEffect(() => {
    Promise.allSettled([
      historyService.getLatest(),
      healthProfileService.get(),
    ]).then(([vitalsRes, profileRes]) => {
      const latest  = vitalsRes.status  === 'fulfilled' ? vitalsRes.value  : null;
      const profile = profileRes.status === 'fulfilled' ? profileRes.value : null;
      let vitals: any = null;
      if (latest?.length) {
        const byType = Object.fromEntries(latest.map((r: any) => [r.type, r.result]));
        const face   = byType['face-rppg'] || {};
        const voice  = byType['voice']     || {};
        vitals = {
          hr_bpm:         face.hr_fft || face.hr_bpm,
          stress_level:   face.stress_level,
          hrv_ms:         face.hrv_ms,
          blood_pressure: voice.blood_pressure,
        };
      }
      contextRef.current = {vitals, health_profile: profile};
    });
  }, []);

  // FIX M2: only set initial messages on first mount, not on every language change
  // (changing language in the middle of a session wiped chat history)
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    setMessages(INITIAL_MESSAGES());
  }, [strings]);

  const sendMessage = async (text?: string) => {
    const msg = text || inputText.trim();
    if (!msg) return;
    const userMsg: Message = {id: Date.now().toString(), role: 'user', text: msg, time: formatTime()};
    
    // Save current messages for history before adding new user message
    const currentMessages = [...messages];
    
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({animated: true}), 80);

    // Merge consecutive messages with the same role to prevent HuggingFace Template errors
    const apiHistory: {role: 'user' | 'model', content: string}[] = [];
    currentMessages.forEach(m => {
      const mappedRole = m.role === 'bot' ? 'model' : 'user';
      if (apiHistory.length > 0 && apiHistory[apiHistory.length - 1].role === mappedRole) {
        apiHistory[apiHistory.length - 1].content += '\n' + m.text;
      } else {
        apiHistory.push({ role: mappedRole, content: m.text });
      }
    });

    try {
      const response = await chatService.sendMessage(msg, apiHistory, language, contextRef.current);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: response.reply,
        time: formatTime(),
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error("Chatbot API error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: strings.errorChatbotDefault || "Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau.",
        time: formatTime(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({animated: true}), 80);
    }
  };

  return (
    <SafeAreaView style={[styles.root, {backgroundColor: C.bg}]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}>

        {/* ── Header ── */}
        <View style={[styles.header, {backgroundColor: C.card, borderBottomColor: C.border}]}>
          <View style={[styles.botAvatar, {backgroundColor: C.teal}]}>
            <MaterialIcons name="smart-toy" size={22} color="#fff" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, {color: C.text}]}>Q-Bot</Text>
            <View style={styles.onlineRow}>
              <View style={[styles.onlineDot, {backgroundColor: '#22c55e'}]} />
              <Text style={[styles.onlineText, {color: C.textSub}]}>{strings.chatOnline}</Text>
            </View>
          </View>
        </View>

        {/* ── Messages ── */}
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({animated: false})}>

          {messages.map(msg => (
            <AnimatedBubble
              key={msg.id}
              style={[styles.messageRow, msg.role === 'user' && styles.userRow]}>
              {msg.role === 'bot' && (
                <View style={[styles.miniAvatar, {backgroundColor: C.teal}]}>
                  <MaterialIcons name="smart-toy" size={13} color="#fff" />
                </View>
              )}
              <View
                style={[
                  styles.bubble,
                  msg.role === 'user'
                    ? {backgroundColor: C.teal, borderColor: 'transparent'}
                    : {backgroundColor: C.card, borderColor: C.border},
                ]}>
                {msg.role === 'user' ? (
                  <Text style={[styles.bubbleText, {color: '#fff'}]}>
                    {msg.text}
                  </Text>
                ) : (
                  <Markdown
                    style={{
                      body: {color: C.text, fontSize: 14, lineHeight: 21},
                      code_block: {backgroundColor: C.bg, color: C.text, padding: 8, borderRadius: 8, marginTop: 4, marginBottom: 4},
                      code_inline: {backgroundColor: C.bg, color: C.text, paddingHorizontal: 4, borderRadius: 4},
                      paragraph: {marginTop: 0, marginBottom: 8},
                      heading1: {color: C.text, marginTop: 8, marginBottom: 4},
                      heading2: {color: C.text, marginTop: 8, marginBottom: 4},
                      heading3: {color: C.text, marginTop: 8, marginBottom: 4},
                      list_item: {color: C.text, marginVertical: 2},
                      strong: {color: C.text, fontWeight: 'bold'},
                    }}>
                    {msg.text}
                  </Markdown>
                )}
                <Text style={[styles.timeText, {color: msg.role === 'user' ? 'rgba(255,255,255,0.65)' : C.textSub}]}>
                  {msg.time}
                </Text>
              </View>
            </AnimatedBubble>
          ))}

          {/* typing indicator — slides in when AI is thinking */}
          {isTyping && (
            <AnimatedBubble style={styles.messageRow}>
              <View style={[styles.miniAvatar, {backgroundColor: C.teal}]}>
                <MaterialIcons name="smart-toy" size={13} color="#fff" />
              </View>
              <View style={[styles.bubble, {backgroundColor: C.card, borderColor: C.border}]}>
                <TypingDots color={C.teal} />
              </View>
            </AnimatedBubble>
          )}
        </ScrollView>

        {/* ── Quick replies ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.quickWrap, {borderTopColor: C.border}]}
          contentContainerStyle={styles.quickRow}>
          {QUICK_REPLIES.map(q => (
            <TouchableOpacity
              key={q}
              style={[styles.quickChip, {backgroundColor: C.surface, borderColor: C.teal + '55'}]}
              onPress={() => sendMessage(q)}>
              <MaterialIcons name="chat-bubble-outline" size={11} color={C.teal} />
              <Text style={[styles.quickText, {color: C.teal}]} numberOfLines={1}>
                {q}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Input bar ── */}
        <View style={[styles.inputBar, {backgroundColor: C.card, borderTopColor: C.border}]}>
          <TextInput
            style={[styles.input, {color: C.text, backgroundColor: C.bg, borderColor: C.border}]}
            placeholder={strings.chatPlaceholder}
            placeholderTextColor={C.textDim}
            value={inputText}
            onChangeText={setInputText}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => sendMessage()}
          />
          <TouchableOpacity
            style={[styles.sendBtn, {backgroundColor: inputText.trim() ? C.teal : C.border}]}
            onPress={() => sendMessage()}
            disabled={!inputText.trim()}>
            <MaterialIcons name="send" size={18} color={inputText.trim() ? '#fff' : C.textDim} />
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles — geometry only ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {flex: 1},
  flex: {flex: 1},
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, gap: 12,
  },
  botAvatar: {width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center'},
  headerInfo: {gap: 2},
  headerName: {fontSize: 16, fontWeight: '700', letterSpacing: 0.2},
  onlineRow: {flexDirection: 'row', alignItems: 'center', gap: 5},
  onlineDot: {width: 7, height: 7, borderRadius: 4},
  onlineText: {fontSize: 12},
  messages: {flex: 1},
  messagesContent: {padding: 16, gap: 10, paddingBottom: 8},
  messageRow: {flexDirection: 'row', alignItems: 'flex-end', gap: 8},
  userRow: {flexDirection: 'row-reverse'},
  miniAvatar: {width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 4},
  bubble: {maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderWidth: 1, gap: 4},
  bubbleText: {fontSize: 14, lineHeight: 21},
  timeText: {fontSize: 10, alignSelf: 'flex-end'},
  quickWrap: {borderTopWidth: 1, maxHeight: 52},
  quickRow: {paddingHorizontal: 14, paddingVertical: 9, gap: 8, alignItems: 'center'},
  quickChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  quickText: {fontSize: 12, fontWeight: '500'},
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    padding: 10, borderTopWidth: 1, gap: 10,
  },
  input: {
    flex: 1, fontSize: 14, maxHeight: 100,
    paddingVertical: 9, paddingHorizontal: 14,
    borderRadius: 22, lineHeight: 20, borderWidth: 1,
  },
  sendBtn: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
});

export default ChatScreen;
