import React, {useState, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Animated,
} from 'react-native';
import {MaterialIcons, MaterialCommunityIcons} from '@expo/vector-icons';
import {useLanguage} from '../../../core/i18n/LanguageContext';
import {useNavigation, CommonActions, useFocusEffect} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import type {RootStackParamList, MainTabParamList} from '../../../core/navigation/AppNavigator';
import {useColors} from '../../../core/theme/useColors';
import Svg, {Circle, Defs, LinearGradient, Stop} from 'react-native-svg';
import historyService from '../../../core/api/historyService';
import healthProfileService from '../../../core/api/healthProfileService';

// ─── Skeleton Component for Stats ─────────────────────────────────────────────
const SkeletonText = ({width = 30, height = 24}: {width?: number; height?: number}) => {
  const anim = useRef(new Animated.Value(0.2)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {toValue: 0.6, duration: 600, useNativeDriver: true}),
        Animated.timing(anim, {toValue: 0.2, duration: 600, useNativeDriver: true}),
      ])
    ).start();
  }, [anim]);

  return (
    <Animated.View style={{
      width, height, borderRadius: 6, backgroundColor: '#888', opacity: anim, marginVertical: 2
    }} />
  );
};

// ─── Avatar with SVG gradient arc ring ───────────────────────────────────────
const AvatarRing = ({color, bg}: {color: string; bg: string}) => {
  const SIZE = 132;
  const STROKE = 3;
  const R = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * R;

  return (
    <View style={{width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center'}}>
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="arcGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="1" />
            <Stop offset="60%" stopColor={color} stopOpacity="0.5" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </LinearGradient>
        </Defs>
        {/* Faint full background ring */}
        <Circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          stroke={color} strokeOpacity={0.12} strokeWidth={STROKE}
          fill="none"
        />
        {/* Gradient arc ~80% */}
        <Circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          stroke="url(#arcGrad)" strokeWidth={STROKE + 1}
          strokeDasharray={`${CIRC * 0.8} ${CIRC * 0.2}`}
          strokeDashoffset={CIRC * 0.05}
          strokeLinecap="round"
          fill="none"
          rotation="-90"
          origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
      </Svg>

      {/* Inner circle avatar */}
      <View style={[avatarStyles.inner, {backgroundColor: bg}]}>
        <View style={[
          avatarStyles.circle,
          {backgroundColor: color + '22', borderColor: color + '55', borderWidth: 1.5},
        ]}>
          <MaterialIcons name="person" size={50} color={color} />
        </View>
      </View>
    </View>
  );
};

const avatarStyles = StyleSheet.create({
  inner: {
    width: 110, height: 110, borderRadius: 55,
    alignItems: 'center', justifyContent: 'center',
  },
  circle: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
const ProfileScreen = () => {
  const {strings} = useLanguage();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const C = useColors();

  const [stats, setStats] = useState<{total: number; days: number; streak: number} | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const loadStats = useCallback(async () => {
    try {
      const s = await historyService.getStats();
      setStats(s);
    } catch {
      setStats({total: 0, days: 0, streak: 0});
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Auto reload when screen comes into focus
      setStatsLoading(true);
      loadStats().finally(() => setStatsLoading(false));
      healthProfileService.get().then(setProfile).catch(() => setProfile(null));
    }, [loadStats])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const MENU_SECTIONS = [
    {
      title: strings.profileSectionAccount,
      items: [
        {icon: 'account-circle',         lib: 'community', label: strings.profilePersonalInfo,  color: C.teal,   sub: strings.profilePersonalInfoSub, route: 'PersonalInfo'},
        {icon: 'medical-bag',            lib: 'community', label: 'Hồ sơ sức khoẻ',             color: C.green,  sub: 'Cập nhật chỉ số, tiền sử bệnh lý', route: 'ProfileSetup', params: {editMode: true}},
        {icon: 'chart-timeline-variant', lib: 'community', label: strings.historyTitle,          color: C.red,    sub: strings.historySubtitle,         route: 'TAB:History'},
      ],
    },
    {
      title: strings.settingsTitle,
      items: [
        {icon: 'bell-outline',           lib: 'community', label: strings.profileNotifications,  color: C.amber,  sub: strings.profileNotificationsSub, route: 'Notifications'},
        {icon: 'shield-key-outline',     lib: 'community', label: strings.profileSecurity,        color: C.purple, sub: strings.profileSecuritySub,      route: 'Security'},
      ],
    },
    {
      title: strings.profileSectionApp,
      items: [
        {icon: 'help-circle-outline',    lib: 'community', label: strings.profileHelp,            color: C.blue,   sub: strings.profileHelpSub,          route: 'Help'},
      ],
    },
  ];

  const STATS = [
    {label: strings.statMeasurements, value: String(stats?.total ?? 0), icon: 'pulse',    color: C.teal},
    {label: strings.statDays,         value: String(stats?.days  ?? 0), icon: 'calendar', color: C.purple},
    {label: strings.statScore,        value: String(stats?.streak ?? 0), icon: 'fire',     color: C.amber},
  ];

  const handleMenuPress = (route: string, params?: any) => {
    if (route.startsWith('TAB:')) {
      const tabName = route.replace('TAB:', '') as keyof MainTabParamList;
      navigation.dispatch(CommonActions.navigate({name: 'Main', params: {screen: tabName}}));
    } else {
      navigation.navigate(route as any, params);
    }
  };

  return (
    <SafeAreaView style={[styles.root, {backgroundColor: C.bg}]}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.teal} />
        }
      >

        {/* ── Header bar ── */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, {color: C.text}]}>{strings.profilePageTitle}</Text>
          <TouchableOpacity
            style={[styles.headerAction, {backgroundColor: C.surface, borderColor: C.border}]}>
            <MaterialCommunityIcons name="pencil-outline" size={18} color={C.teal} />
          </TouchableOpacity>
        </View>

        {/* ── Hero / Avatar ── */}
        <View style={styles.heroSection}>
          {/* Background glow blobs */}
          <View style={[styles.glowBlob,       {backgroundColor: C.teal   + '18'}]} />
          <View style={[styles.glowBlobSecond,  {backgroundColor: C.purple + '10'}]} />

          {/* Avatar ring + floating buttons */}
          <View style={styles.avatarWrap}>
            <AvatarRing color={C.teal} bg={C.card} />

            {/* Camera — change photo */}
            <TouchableOpacity
              style={[styles.cameraBtn, {backgroundColor: C.teal, borderColor: C.bg}]}
              activeOpacity={0.8}>
              <MaterialCommunityIcons name="camera-plus-outline" size={14} color={C.bg} />
            </TouchableOpacity>


          </View>

          <Text style={[styles.userName,  {color: C.text}]}>
            {profile?.full_name || strings.profileDefaultName}
          </Text>
          <Text style={[styles.userEmail, {color: C.textSub}]}>
            {profile?.gender ? `Giới tính: ${profile.gender}` : 'Hồ sơ sức khoẻ local'}
          </Text>

          <View style={[styles.memberBadge, {backgroundColor: C.teal + '18', borderColor: C.teal + '40'}]}>
            <MaterialCommunityIcons name="check-decagram" size={13} color={C.teal} />
            <Text style={[styles.memberBadgeText, {color: C.teal}]}>{strings.memberBadge}</Text>
          </View>
        </View>

        {/* ── Stat chips ── */}
        <View style={styles.statsRow}>
          {STATS.map(s => (
            <View key={s.label} style={[styles.statChip, {backgroundColor: C.card, borderColor: s.color + '30'}]}>
              <View style={[styles.statChipIcon, {backgroundColor: s.color + '18'}]}>
                <MaterialCommunityIcons name={s.icon as any} size={16} color={s.color} />
              </View>
              {statsLoading ? (
                <SkeletonText width={44} height={26} />
              ) : (
                <Text style={[styles.statChipValue, {color: s.color}]}>{s.value}</Text>
              )}
              <Text style={[styles.statChipLabel, {color: C.textSub}]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Menu sections ── */}
        {MENU_SECTIONS.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, {color: C.textSub}]}>{section.title}</Text>
            <View style={[styles.menuCard, {backgroundColor: C.card, borderColor: C.border}]}>
              {section.items.map((item, idx) => (
                <React.Fragment key={item.label}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    activeOpacity={0.7}
                    onPress={() => handleMenuPress(item.route, (item as any).params)}>
                    <View style={[styles.menuIconWrap, {backgroundColor: item.color + '18'}]}>
                      <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />
                    </View>
                    <View style={styles.menuTexts}>
                      <Text style={[styles.menuLabel, {color: C.text}]}>{item.label}</Text>
                      <Text style={[styles.menuSub,   {color: C.textSub}]}>{item.sub}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={C.textDim} />
                  </TouchableOpacity>
                  {idx < section.items.length - 1 && (
                    <View style={[styles.menuDivider, {backgroundColor: C.border}]} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        <View style={{height: 24}} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   {flex: 1},
  scroll: {paddingBottom: 110},

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  headerTitle:  {fontSize: 26, fontWeight: '800', letterSpacing: -0.5},
  headerAction: {
    width: 38, height: 38, borderRadius: 12,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },

  // Hero
  heroSection: {alignItems: 'center', paddingTop: 32, paddingBottom: 28},
  glowBlob: {
    position: 'absolute', top: 0,
    width: 240, height: 240, borderRadius: 120,
  },
  glowBlobSecond: {
    position: 'absolute', top: 50, left: 10,
    width: 160, height: 160, borderRadius: 80,
  },

  // Avatar container — children absolutely positioned over the ring
  avatarWrap: {marginBottom: 20, position: 'relative'},

  // Camera button — bottom-right of the 132px ring
  cameraBtn: {
    position: 'absolute', bottom: 4, right: 0,
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000', shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3, shadowRadius: 4,
  },



  userName:    {fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4},
  userEmail:   {fontSize: 13, marginBottom: 12},
  memberBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  memberBadgeText: {fontSize: 12, fontWeight: '700'},

  // Stats
  statsRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 10, marginBottom: 28, paddingHorizontal: 20,
  },
  statChip: {
    flex: 1, alignItems: 'center', gap: 5,
    borderRadius: 16, borderWidth: 1,
    paddingVertical: 14, paddingHorizontal: 8,
  },
  statChipIcon:  {width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
  statChipValue: {fontSize: 20, fontWeight: '800', letterSpacing: -0.5},
  statChipLabel: {fontSize: 11, fontWeight: '500'},

  // Menu
  section:      {marginBottom: 16, paddingHorizontal: 20},
  sectionTitle: {
    fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1.2,
    marginBottom: 8, marginLeft: 4,
  },
  menuCard:     {borderRadius: 18, borderWidth: 1, overflow: 'hidden'},
  menuItem:     {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 15, gap: 13,
  },
  menuIconWrap: {width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
  menuTexts:    {flex: 1, gap: 2},
  menuLabel:    {fontSize: 15, fontWeight: '600'},
  menuSub:      {fontSize: 12},
  menuDivider:  {height: 1, marginLeft: 69},
});

export default ProfileScreen;
