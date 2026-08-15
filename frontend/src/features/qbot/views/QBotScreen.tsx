import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';

import Card from '../../../shared/components/Card';
import Screen from '../../../shared/components/Screen';
import Input from '../../../shared/components/Input';
import Button from '../../../shared/components/Button';
import {useTheme} from '../../../core/theme/ThemeContext';

const QBotScreen = () => {
  const {theme} = useTheme();

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={[styles.avatar, {backgroundColor: theme.colors.cardLight}]}>
          <MaterialIcons name="smart-toy" size={28} color={theme.colors.primary} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, {color: theme.colors.text}]}>Q-Bot</Text>
          <Text style={[styles.subtitle, {color: theme.colors.textSecondary}]}>
            Chatbot UI placeholder
          </Text>
        </View>
      </View>

      <Card style={styles.messageCard}>
        <Text style={[styles.cardTitle, {color: theme.colors.text}]}>
          Nội dung phần Q-Bot
        </Text>
        <Text style={[styles.body, {color: theme.colors.textSecondary}]}>
          Code chatbot cũ đã được xoá. Màn này chỉ giữ khung frontend để sau này
          anh tự xây lại phần hội thoại, bubble tin nhắn và input chat.
        </Text>
      </Card>

      <View style={styles.inputArea}>
        <Input
          label="Tin nhắn"
          placeholder="Nhập câu hỏi sức khỏe..."
          leftIcon="chat-bubble-outline"
          editable={false}
          containerStyle={styles.input}
        />
        <Button title="Gửi" icon="send" disabled onPress={() => {}} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  messageCard: {
    marginTop: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
  inputArea: {
    marginTop: 'auto',
  },
  input: {
    marginBottom: 10,
  },
});

export default QBotScreen;
