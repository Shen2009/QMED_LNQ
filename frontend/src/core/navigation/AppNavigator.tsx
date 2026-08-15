import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {MaterialIcons} from '@expo/vector-icons';
import {Platform, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator} from 'react-native';
import {useTheme} from '../theme/ThemeContext';
import {useLanguage} from '../i18n/LanguageContext';
import healthProfileService from '../api/healthProfileService';

import HomeScreen from '../../features/home/views/HomeScreen';
import HistoryScreen from '../../features/history/views/HistoryScreen';
import ChatScreen from '../../features/chatbot/views/ChatScreen';
import ProfileScreen from '../../features/profile/views/ProfileScreen';
import SettingsScreen from '../../features/settings/views/SettingsScreen';
import MeasurementListScreen from '../../features/measurement/views/MeasurementListScreen';
import MeasurementDetailScreen from '../../features/measurement/views/MeasurementDetailScreen';
import MeasurementResultScreen from '../../features/measurement/views/MeasurementResultScreen';
import HealthExamScreen from '../../features/measurement/views/HealthExamScreen';
import MedGemmaReportScreen from '../../features/measurement/views/MedGemmaReportScreen';
import FaceRppgScreen from '../../features/measurement/views/FaceRppgScreen';
import StressScreen from '../../features/measurement/views/StressScreen';
import HeartbeatScreen from '../../features/measurement/views/HeartbeatScreen';
import BloodPressureScreen from '../../features/measurement/views/BloodPressureScreen';
import PersonalInfoScreen from '../../features/profile/views/PersonalInfoScreen';
import NotificationsScreen from '../../features/profile/views/NotificationsScreen';
import SecurityScreen from '../../features/profile/views/SecurityScreen';
import HelpScreen from '../../features/profile/views/HelpScreen';
import ProfileSetupScreen from '../../features/profile/views/ProfileSetupScreen';

export type RootStackParamList = {
  ProfileSetup: {editMode?: boolean} | undefined;
  Main: undefined;
  MeasurementList: undefined;
  MeasurementDetail: {type: string};
  MeasurementResult: {result: any; type: string};
  HealthExam: undefined;
  MedGemmaReport: {record: any};
  FaceRppg: undefined;
  Stress: undefined;
  Heartbeat: undefined;
  BloodPressure: undefined;
  PersonalInfo: undefined;
  Notifications: undefined;
  Security: undefined;
  Help: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  History: undefined;
  QBot: undefined;
  Profile: undefined;
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const {theme} = useTheme();
  const {strings} = useLanguage();
  const tabs: Array<{name: keyof MainTabParamList; icon: keyof typeof MaterialIcons.glyphMap; label: string}> = [
    {name: 'Home', icon: 'home', label: strings.navHome || 'Trang chủ'},
    {name: 'History', icon: 'history', label: strings.navHistory || 'Lịch sử'},
    {name: 'QBot', icon: 'smart-toy', label: strings.navChat || 'Q-Bot'},
    {name: 'Profile', icon: 'person', label: strings.navProfile || 'Hồ sơ'},
    {name: 'Settings', icon: 'settings', label: strings.navSettings || 'Cài đặt'},
  ];

  return (
    <Tab.Navigator
      tabBar={({state, navigation}) => (
        <View style={[styles.tabBar, {backgroundColor: theme.colors.navBg, borderTopColor: theme.colors.border}]}>
          {state.routes.map((route, index) => {
            const tab = tabs.find(item => item.name === route.name) || tabs[0];
            const focused = state.index === index;
            return (
              <TouchableOpacity
                key={route.key}
                style={styles.tabItem}
                onPress={() => navigation.navigate(route.name as never)}
                accessibilityRole="button">
                <MaterialIcons name={tab.icon} size={24} color={focused ? theme.colors.primary : theme.colors.textMuted} />
                <Text style={[styles.tabLabel, {color: focused ? theme.colors.primary : theme.colors.textMuted}]} numberOfLines={1}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      screenOptions={{headerShown: false}}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="QBot" component={ChatScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [profileReady, setProfileReady] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    healthProfileService.checkExists().then(setProfileReady).catch(() => setProfileReady(false));
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {profileReady === null ? (
          <Stack.Screen name="ProfileSetup">
            {() => <View style={styles.loading}><ActivityIndicator color="#00D4B8" /></View>}
          </Stack.Screen>
        ) : !profileReady ? (
          <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
            <Stack.Screen name="MeasurementList" component={MeasurementListScreen} />
            <Stack.Screen name="MeasurementDetail" component={MeasurementDetailScreen} />
            <Stack.Screen name="MeasurementResult" component={MeasurementResultScreen} />
            <Stack.Screen name="HealthExam" component={HealthExamScreen} />
            <Stack.Screen name="MedGemmaReport" component={MedGemmaReportScreen} />
            <Stack.Screen name="FaceRppg" component={FaceRppgScreen} />
            <Stack.Screen name="Stress" component={StressScreen} />
            <Stack.Screen name="Heartbeat" component={HeartbeatScreen} />
            <Stack.Screen name="BloodPressure" component={BloodPressureScreen} />
            <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Security" component={SecurityScreen} />
            <Stack.Screen name="Help" component={HelpScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {flexDirection: 'row', height: 76, borderTopWidth: 1, paddingHorizontal: 4, paddingBottom: Platform.OS === 'ios' ? 16 : 8, paddingTop: 6, alignItems: 'center'},
  tabItem: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4},
  tabLabel: {fontSize: 10, marginTop: 3},
  loading: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D1117'},
});
