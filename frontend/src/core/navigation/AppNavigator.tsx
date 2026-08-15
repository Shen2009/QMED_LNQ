import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import {MaterialIcons} from '@expo/vector-icons';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSelector} from 'react-redux';

import {useLanguage} from '../i18n/LanguageContext';
import {RootState} from '../store/store';
import {useTheme} from '../theme/ThemeContext';

import LanguageSelectScreen from '../../features/onboarding/views/LanguageSelectScreen';
import OnboardingScreen from '../../features/onboarding/views/OnboardingScreen';
import HomeScreen from '../../features/home/views/HomeScreen';
import HistoryScreen from '../../features/history/views/HistoryScreen';
import MeasurementListScreen from '../../features/measurement/views/MeasurementListScreen';
import FaceRppgScreen from '../../features/measurement/views/FaceRppgScreen';
import StressScreen from '../../features/measurement/views/StressScreen';
import BloodPressureScreen from '../../features/measurement/views/BloodPressureScreen';
import HeartbeatScreen from '../../features/measurement/views/HeartbeatScreen';
import MeasurementResultScreen from '../../features/measurement/views/MeasurementResultScreen';
import QBotScreen from '../../features/qbot/views/QBotScreen';
import SettingsScreen from '../../features/settings/views/SettingsScreen';

export type RootStackParamList = {
  LanguageSelect: undefined;
  Onboarding: undefined;
  Main: undefined;
  FaceRppg: undefined;
  Stress: undefined;
  BloodPressure: undefined;
  Heartbeat: undefined;
  MeasurementResult: {result?: any};
};

export type MainTabParamList = {
  Home: undefined;
  History: undefined;
  Measure: undefined;
  QBot: undefined;
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_META: Record<
  keyof MainTabParamList,
  {icon: keyof typeof MaterialIcons.glyphMap; fallback: string}
> = {
  Home: {icon: 'home', fallback: 'Trang chủ'},
  History: {icon: 'history', fallback: 'Lịch sử'},
  Measure: {icon: 'monitor-heart', fallback: 'Đo'},
  QBot: {icon: 'smart-toy', fallback: 'Q-Bot'},
  Settings: {icon: 'settings', fallback: 'Cài đặt'},
};

const getTabLabel = (
  routeName: keyof MainTabParamList,
  strings: ReturnType<typeof useLanguage>['strings'],
) => {
  const labels: Record<keyof MainTabParamList, string> = {
    Home: strings.navHome || TAB_META.Home.fallback,
    History: strings.navHistory || TAB_META.History.fallback,
    Measure: strings.measurementListTitle || TAB_META.Measure.fallback,
    QBot: strings.navChat || TAB_META.QBot.fallback,
    Settings: strings.navSettings || TAB_META.Settings.fallback,
  };
  return labels[routeName];
};

function CustomTabBar({state, navigation}: any) {
  const {theme} = useTheme();
  const {strings} = useLanguage();

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: theme.colors.navBg,
          borderTopColor: theme.colors.border,
        },
      ]}>
      {state.routes.map((route: any, index: number) => {
        const routeName = route.name as keyof MainTabParamList;
        const focused = state.index === index;
        const meta = TAB_META[routeName];
        const label = getTabLabel(routeName, strings);
        const isCenter = routeName === 'Measure';
        const color = focused ? theme.colors.primary : theme.colors.textMuted;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (isCenter) {
          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.85}
              onPress={onPress}
              style={styles.centerTab}>
              <View
                style={[
                  styles.centerButton,
                  {
                    backgroundColor: theme.colors.primary,
                    shadowColor: theme.colors.primary,
                  },
                ]}>
                <MaterialIcons name={meta.icon} size={28} color="#FFFFFF" />
              </View>
              <Text style={[styles.centerLabel, {color}]} numberOfLines={1}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            activeOpacity={0.75}
            onPress={onPress}
            style={styles.tabItem}>
            <MaterialIcons name={meta.icon} size={24} color={color} />
            <Text
              style={[
                styles.tabLabel,
                {color, fontWeight: focused ? '700' : '500'},
              ]}
              numberOfLines={1}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{headerShown: false}}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Measure" component={MeasurementListScreen} />
      <Tab.Screen name="QBot" component={QBotScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const onboardingDone = useSelector(
    (state: RootState) => state.app.onboardingDone,
  );
  const languageSelectDone = useSelector(
    (state: RootState) => state.app.languageSelectDone,
  );

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {!languageSelectDone ? (
          <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
        ) : !onboardingDone ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="FaceRppg" component={FaceRppgScreen} />
            <Stack.Screen name="Stress" component={StressScreen} />
            <Stack.Screen name="BloodPressure" component={BloodPressureScreen} />
            <Stack.Screen name="Heartbeat" component={HeartbeatScreen} />
            <Stack.Screen
              name="MeasurementResult"
              component={MeasurementResultScreen}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: 78,
    alignItems: 'center',
    borderTopWidth: 1,
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 18 : 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
  },
  centerTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    marginTop: -26,
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  centerLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
  },
});
