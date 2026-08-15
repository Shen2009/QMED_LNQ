export type AppLanguage = 'vi' | 'en';

export interface AppStrings {
  splashSubtitle: string;
  navHome: string;
  navHistory: string;
  navChat: string;
  navSettings: string;
  measurementListTitle: string;
  language: string;
  vietnamese: string;
  english: string;
  settingsTitle: string;
  settingsSectionAppearance: string;
  settingsSectionApp: string;
  settingsVersion: string;
  settingsTerms: string;
  settingsPrivacy: string;
  lightMode: string;
  darkMode: string;
  langSelectTitle: string;
  langSelectSubtitle: string;
  langSelectContinue: string;
  onboardSlide1Title: string;
  onboardSlide1Sub: string;
  onboardSlide2Title: string;
  onboardSlide2Sub: string;
  onboardSlide3Title: string;
  onboardSlide3Sub: string;
  onboardSkip: string;
  onboardStart: string;
}

const vi: AppStrings = {
  splashSubtitle: 'Theo dõi sức khỏe bằng AI',
  navHome: 'Trang chủ',
  navHistory: 'Lịch sử',
  navChat: 'Q-Bot',
  navSettings: 'Cài đặt',
  measurementListTitle: 'Đo',
  language: 'Ngôn ngữ',
  vietnamese: 'Tiếng Việt',
  english: 'English',
  settingsTitle: 'Cài đặt',
  settingsSectionAppearance: 'Giao diện',
  settingsSectionApp: 'Ứng dụng',
  settingsVersion: 'Phiên bản',
  settingsTerms: 'Điều khoản sử dụng',
  settingsPrivacy: 'Chính sách bảo mật',
  lightMode: 'Chế độ sáng',
  darkMode: 'Chế độ tối',
  langSelectTitle: 'Chọn ngôn ngữ',
  langSelectSubtitle: 'Bạn muốn sử dụng ứng dụng bằng ngôn ngữ nào?',
  langSelectContinue: 'Tiếp tục',
  onboardSlide1Title: 'Theo dõi sức khỏe mọi nơi, mọi lúc',
  onboardSlide1Sub:
    'Đo nhịp tim, huyết áp, SpO2 và các chỉ số sinh tồn khác ngay trên điện thoại của bạn.',
  onboardSlide2Title: 'Chia chức năng thành module',
  onboardSlide2Sub:
    'Mỗi phần như Home, Measure, History, Q-Bot và Settings có trách nhiệm riêng.',
  onboardSlide3Title: 'Sẵn sàng mở rộng',
  onboardSlide3Sub:
    'Sau khi frontend ổn định, anh có thể kết nối API hoặc thêm logic thật sau.',
  onboardSkip: 'Bỏ qua',
  onboardStart: 'Bắt đầu',
};

const en: AppStrings = {
  splashSubtitle: 'AI health monitoring',
  navHome: 'Home',
  navHistory: 'History',
  navChat: 'Q-Bot',
  navSettings: 'Settings',
  measurementListTitle: 'Measure',
  language: 'Language',
  vietnamese: 'Vietnamese',
  english: 'English',
  settingsTitle: 'Settings',
  settingsSectionAppearance: 'Appearance',
  settingsSectionApp: 'Application',
  settingsVersion: 'Version',
  settingsTerms: 'Terms of use',
  settingsPrivacy: 'Privacy policy',
  lightMode: 'Light mode',
  darkMode: 'Dark mode',
  langSelectTitle: 'Choose language',
  langSelectSubtitle: 'Which language would you like to use?',
  langSelectContinue: 'Continue',
  onboardSlide1Title: 'Track your health anywhere, anytime',
  onboardSlide1Sub:
    'Measure heart rate, blood pressure, SpO2 and other vital signs right on your phone.',
  onboardSlide2Title: 'Split features into modules',
  onboardSlide2Sub:
    'Home, Measure, History, Q-Bot, and Settings each own one clear responsibility.',
  onboardSlide3Title: 'Ready to expand',
  onboardSlide3Sub:
    'After the frontend is stable, you can connect APIs or add real logic later.',
  onboardSkip: 'Skip',
  onboardStart: 'Start',
};

export const getStrings = (language: AppLanguage): AppStrings =>
  language === 'en' ? en : vi;
