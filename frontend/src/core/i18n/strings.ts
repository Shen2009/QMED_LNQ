export type AppLanguage = 'vi' | 'en';

export interface AppStrings {
  errorChatbotDefault: string;
  splashSubtitle: string;
  navHome: string;
  navHistory: string;
  navChat: string;
  navProfile: string;
  navSettings: string;
  loginTitle: string;
  loginSubtitle: string;
  email: string;
  password: string;
  emailPlaceholder: string;
  passwordPlaceholder: string;
  forgotPassword: string;
  loginButton: string;
  noAccount: string;
  registerNow: string;
  loginEmptyError: string;
  loginFailed: string;
  registerTitle: string;
  registerSubtitle: string;
  fullName: string;
  namePlaceholder: string;
  registerButton: string;
  hasAccount: string;
  loginNow: string;
  registerEmptyError: string;
  registerFailed: string;
  homeGreeting: (name: string) => string;
  homeQuestion: string;
  quickActions: string;
  startMeasurement: string;
  history: string;
  healthAssistant: string;
  dashboardTitle: string;
  dashboardSubtitle: string;
  historyTitle: string;
  historySubtitle: string;
  statusNormal: string;
  statusLow: string;
  chatTitle: string;
  chatSubtitle: string;
  chatBotName: string;
  chatBotMessage: string;
  profileTitle: string;
  settingsTitle: string;
  lightMode: string;
  darkMode: string;
  logout: string;
  language: string;
  vietnamese: string;
  english: string;
  measurementListTitle: string;
  measurementListSubtitle: string;
  contactPpg: string;
  contactPpgDesc: string;
  faceRppg: string;
  faceRppgDesc: string;
  voice: string;
  voiceDesc: string;
  stress: string;
  stressDesc: string;
  sleep: string;
  sleepDesc: string;
  bloodPressure: string;
  bloodPressureDesc: string;
  measurementDuration: string;
  measurementInstructions: string;
  measurementStart: string;
  measurementRunning: string;
  measurementCancel: string;
  measurementAnalyzing: string;
  measurementStayStill: string;
  resultTitle: string;
  heartRate: string;
  details: string;
  detailFft: string;
  detailPeak: string;
  detailDuration: string;
  detailFrames: string;
  detailDetection: string;
  detected: string;
  notDetected: string;
  resultDone: string;
  measureAgain: string;
  statusBelowNormal: string;
  statusAboveNormal: string;
  // Profile
  profilePageTitle: string;
  memberBadge: string;
  statMeasurements: string;
  statDays: string;
  statScore: string;
  profileSectionAccount: string;
  profileSectionApp: string;
  profilePersonalInfo: string;
  profilePersonalInfoSub: string;
  profileSecurity: string;
  profileSecuritySub: string;
  profileNotifications: string;
  profileNotificationsSub: string;
  profileHelp: string;
  profileHelpSub: string;
  profileDefaultName: string;
  // Notifications screen
  notificationsTitle: string;
  notifSectionLabel: string;
  notifReminder: string;
  notifReminderSub: string;
  notifResult: string;
  notifResultSub: string;
  notifUpdate: string;
  notifUpdateSub: string;
  notifHint: string;
  // PersonalInfo screen
  personalInfoTitle: string;
  comingSoon: string;
  personalInfoSub: string;
  // Security screen
  securityTitle: string;
  securitySub: string;
  // History screen
  filterAll: string;
  filterFace: string;
  filterVoice: string;
  filterBp: string;
  filterStress: string;
  filterSleep: string;
  filterFinger: string;
  filterNormal: string;
  filterHigh: string;
  filterLow: string;
  historyEmpty: string;
  historyEmptyHint: string;
  historyBpm: string;
  historyJustNow: string;
  historyFaceHr: string;
  historyContactHr: string;
  historyStress: string;
  historyVoice: string;
  historyBpVoice: string;
  historySleep: string;
  historyResults: string;
  historyLatest: string;
  historyNeedImprovement: string;
  today: string;
  yesterday: string;
  hours: string;
  // Home screen
  homeMeasureDetail: string;
  homeViewHistory: string;
  homeOverview: string;
  homeScoreGood: string;
  homeComparedLastWeek: string;
  homeBloodPressureLabel: string;
  homeLiveUpdate: string;
  homeStartMeasure: string;
  homeSeeAll: string;
  // Settings screen
  settingsSectionAppearance: string;
  settingsSectionApp: string;
  settingsVersion: string;
  settingsTerms: string;
  settingsPrivacy: string;
  // MeasurementDetail
  measureDetailTitle: string;
  // Chat screen
  chatOnline: string;
  chatGreeting1: string;
  chatGreeting2: string;
  chatQuick1: string;
  chatQuick2: string;
  chatQuick3: string;
  chatPlaceholder: string;
  chatBotThinking: string;
  // Language select screen
  langSelectTitle: string;
  langSelectSubtitle: string;
  langSelectContinue: string;
  // Onboarding slides
  onboardSlide1Title: string;
  onboardSlide1Sub: string;
  onboardSlide2Title: string;
  onboardSlide2Sub: string;
  onboardSlide3Title: string;
  onboardSlide3Sub: string;
  onboardSkip: string;
  onboardStart: string;
  // HealthExam screen
  healthExamTitle: string;
  healthExamSubtitle: string;
  healthExamStepFaceLabel: string;
  healthExamStepFaceSub: string;
  healthExamStepFaceInstruction: string;
  healthExamStepFaceScript: string;
  healthExamStepVoiceLabel: string;
  healthExamStepVoiceSub: string;
  healthExamStepVoiceInstruction: string;
  healthExamStepVoiceScript: string;
  healthExamStepScgLabel: string;
  healthExamStepScgSub: string;
  healthExamStepScgInstruction: string;
  healthExamIntroTitle: string;
  healthExamIntroBanner: string;
  healthExamIntroBannerSub: string;
  healthExamStartStep: (n: number) => string;
  healthExamDone: string;
  healthExamDoneSub: string;
  healthExamAllData: string;
  healthExamSendGemma: string;
  healthExamGemmaHint: string;
  healthExamGemmaHintBold1: string;
  healthExamGemmaHintBold2: string;
  healthExamScript: string;
  healthExamGrantCamera: string;
  healthExamCameraPermission: string;
  healthExamKeepFace: string;
  healthExamCompleted: string;
  // HealthExam measuring & step UI
  healthExamSeconds: string;
  healthExamSecondsLeft: string;
  // Shared measurement screen keys
  measSecondsLeft: string;
  measSeconds: string;
  measStartBtn: string;
  measStartVoice: string;
  measStartStress: string;
  measInstructions: string;
  measScript: string;
  measRecording: string;
  measAnalyzing: string;
  measUploading: string;
  measFaceLocked: string;
  measFaceSearching: string;
  measCameraActive: string;
  measSensorInit: string;
  measRhythmNormal: string;
  measRhythmAnomaly: string;
  // MeasurementDetail screen
  detailInstructions: string;
  detailStartBtn: string;
  healthExamRecording: string;
  healthExamReadScript: string;
  healthExamInstruction: string;
  healthExamStepDoneTitle: (n: number) => string;
  healthExamNextStep: string;
  healthExamFinish: string;
  healthExamNextLabel: (label: string) => string;
  healthExamViewResults: string;
  healthExamStepOf: (cur: number, total: number) => string;
  healthExamAnomalyFound: string;
  healthExamAnomalyNone: string;
  healthExamDoneInstructions: string;
  healthExamNextStepLabel: string;
  // MedGemma report screen
  medGemmaTitle: string;
  medGemmaEMR: string;
  medGemmaAnalyzing: string;
  medGemmaAnalyzingSub: string;
  medGemmaReportTitle: string;
  medGemmaScoreLabel: string;
  medGemmaBpLabel: string;
  medGemmaHrLabel: string;
  medGemmaStressLabel: string;
  medGemmaRiskTitle: string;
  medGemmaRecTitle: string;
  medGemmaDisclaimer: string;
  medGemmaGoHome: string;
  medGemmaRedo: string;
  medGemmaSend: string;
  medGemmaEMRTitle: string;
  medGemmaEMRStatus: string;
  medGemmaEMRDate: string;
  medGemmaHintText: string;
  medGemmaFaceCard: string;
  medGemmaVoiceCard: string;
  medGemmaScgCard: string;
  medGemmaLabelHr: string;
  medGemmaLabelStress: string;
  medGemmaLabelFatigue: string;
  medGemmaLabelHrv: string;
  medGemmaLabelSysBp: string;
  medGemmaLabelDiaBp: string;
  medGemmaLabelBreathing: string;
  medGemmaLabelRhythm: string;
  medGemmaLabelAnomaly: string;
  medGemmaLabelAnomalyScore: string;
  medGemmaAnomalyFound: string;
  medGemmaAnomalyNone: string;
  medGemmaBpClassLabel: string;
  // MedGemma analysis dynamic content
  medGemmaBpStage2: string;
  medGemmaBpStage1: string;
  medGemmaBpPrehyper: string;
  medGemmaBpLow: string;
  medGemmaBpNormal: string;
  medGemmaScoreGood: string;
  medGemmaScoreMid: string;
  medGemmaScoreLow: string;
  medGemmaRiskHighBp: (cat: string, sys: number, dia: number) => string;
  medGemmaRiskAnomaly: (rhythm: string) => string;
  medGemmaRiskStressHigh: (pct: number) => string;
  medGemmaRiskStressMid: (pct: number) => string;
  medGemmaRiskHrvLow: (hrv: number) => string;
  medGemmaRiskNone: string;
  medGemmaRecLowSalt: string;
  medGemmaRecAerobic: string;
  medGemmaRecCardiologist: string;
  medGemmaRecEcg: string;
  medGemmaRecMeditate: string;
  medGemmaRecSleep: string;
  medGemmaRecWater: string;
  medGemmaRecBpMonitor: string;
  medGemmaExamDateLocale: string;
  // MeasurementList header
  measureListHeader: string;
  measureListHeaderSub: string;
  // MeasurementList card content
  measureListStatDuration: string;
  measureListStatAccuracy: string;
  measureListStatDevice: string;
  measureListBanner: string;
  measureListExamTitle: string;
  measureListExamDesc: string;
  measureListSectionFeatured: string;
  measureListSectionOther: string;
  measureListFeaturedLabel: string;
  measureListFeaturedSub: string;
  measureListFeaturedTag: string;
  measureListMeasureNow: string;
  measureListScgLabel: string;
  measureListScgSub: string;
  measureListVoiceLabel: string;
  measureListVoiceSub: string;
  measureListStressLabel: string;
  measureListStressSub: string;
  measureListSleepLabel: string;
  measureListSleepSub: string;
  measureListBadgePopular: string;
  measureListBadgeAccurate: string;
  measureListDisclaimer: string;
}

const vi: AppStrings = {
  splashSubtitle: 'Theo dõi sức khỏe bằng AI',
  navHome: 'Trang chủ',
  navHistory: 'Lịch sử',
  navChat: 'Chat',
  navProfile: 'Hồ sơ',
  navSettings: 'Cài đặt',
  loginTitle: 'Chào mừng trở lại!',
  loginSubtitle: 'Đăng nhập để tiếp tục theo dõi sức khỏe của bạn',
  email: 'Email',
  password: 'Mật khẩu',
  emailPlaceholder: 'Nhập email của bạn',
  passwordPlaceholder: 'Nhập mật khẩu của bạn',
  forgotPassword: 'Quên mật khẩu?',
  loginButton: 'Đăng nhập',
  noAccount: 'Chưa có tài khoản?',
  registerNow: 'Đăng ký ngay',
  errorChatbotDefault: 'Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau.',
  loginEmptyError: 'Vui lòng nhập email và mật khẩu',
  loginFailed: 'Đăng nhập thất bại. Vui lòng thử lại.',
  registerTitle: 'Tạo tài khoản mới',
  registerSubtitle: 'Bắt đầu hành trình chăm sóc sức khỏe cùng Q-Med',
  fullName: 'Họ và tên',
  namePlaceholder: 'Nhập họ và tên',
  registerButton: 'Đăng ký',
  hasAccount: 'Đã có tài khoản?',
  loginNow: 'Đăng nhập ngay',
  registerEmptyError: 'Vui lòng điền đầy đủ thông tin',
  registerFailed: 'Đăng ký thất bại. Vui lòng thử lại.',
  homeGreeting: name => `Chào ${name}!`,
  homeQuestion: 'Hôm nay bạn cảm thấy thế nào?',
  quickActions: 'Thao tác nhanh',
  startMeasurement: 'Bắt đầu đo',
  history: 'Lịch sử',
  healthAssistant: 'Trợ lý sức khỏe',
  dashboardTitle: 'Dashboard sức khỏe',
  dashboardSubtitle: 'Bắt đầu một phép đo để theo dõi chỉ số sức khỏe của bạn',
  historyTitle: 'Lịch sử đo',
  historySubtitle: 'Theo dõi các lần đo gần đây',
  statusNormal: 'Bình thường',
  statusLow: 'Thấp',
  chatTitle: 'Trợ lý AI',
  chatSubtitle: 'Hỏi đáp về sức khỏe và chỉ số đo',
  chatBotName: 'Q-Med Bot',
  chatBotMessage:
    'Xin chào! Tôi có thể hỗ trợ bạn đọc hiểu kết quả đo và tư vấn thói quen lành mạnh.',
  profileTitle: 'Hồ sơ',
  settingsTitle: 'Cài đặt',
  lightMode: 'Chế độ sáng',
  darkMode: 'Chế độ tối',
  logout: 'Đăng xuất',
  language: 'Ngôn ngữ',
  vietnamese: 'Tiếng Việt',
  english: 'English',
  measurementListTitle: 'Bắt đầu đo',
  measurementListSubtitle: 'Chọn loại phép đo',
  contactPpg: 'Đo nhịp tim tiếp xúc',
  contactPpgDesc: 'Áp nhẹ ngón tay lên camera sau và đèn flash',
  faceRppg: 'Đo nhịp tim qua mặt',
  faceRppgDesc: 'Phân tích nhịp tim bằng camera trước',
  voice: 'Phân tích giọng nói',
  voiceDesc: 'Đánh giá chỉ số sức khỏe qua giọng nói',
  stress: 'Phân tích stress',
  stressDesc: 'Đo mức độ căng thẳng hiện tại',
  sleep: 'Phát hiện thiếu ngủ',
  sleepDesc: 'Theo dõi và đánh giá chất lượng giấc ngủ',
  bloodPressure: 'Huyết áp qua khuôn mặt',
  bloodPressureDesc: 'Quét khuôn mặt để đo huyết áp',
  measurementDuration: 'Thời lượng',
  measurementInstructions: 'Hướng dẫn',
  measurementStart: 'Bắt đầu đo',
  measurementRunning: 'Đang đo...',
  measurementCancel: 'Hủy',
  measurementAnalyzing: 'Đang phân tích...',
  measurementStayStill: 'Vui lòng giữ yên',
  resultTitle: 'Kết quả đo',
  heartRate: 'Nhịp tim',
  details: 'Chi tiết',
  detailFft: 'Nhịp tim (FFT)',
  detailPeak: 'Nhịp tim (Peak)',
  detailDuration: 'Thời lượng',
  detailFrames: 'Số frame',
  detailDetection: 'Phát hiện',
  detected: 'Đã phát hiện',
  notDetected: 'Không phát hiện',
  resultDone: 'Hoàn tất',
  measureAgain: 'Đo lại',
  statusBelowNormal: 'Thấp hơn bình thường',
  statusAboveNormal: 'Cao hơn bình thường',
  // Profile
  profilePageTitle: 'Hồ sơ',
  memberBadge: 'Thành viên',
  statMeasurements: 'Lần đo',
  statDays: 'Ngày',
  statScore: 'Điểm',
  profileSectionAccount: 'Tài khoản',
  profileSectionApp: 'Ứng dụng',
  profilePersonalInfo: 'Thông tin cá nhân',
  profilePersonalInfoSub: 'Họ tên, ảnh đại diện, ngày sinh',
  profileSecurity: 'Bảo mật',
  profileSecuritySub: 'Mật khẩu, xác thực 2 bước',
  profileNotifications: 'Thông báo',
  profileNotificationsSub: 'Nhắc nhở, cập nhật, kết quả',
  profileHelp: 'Trợ giúp & phản hồi',
  profileHelpSub: 'Hỏi đáp, gửi phản hồi',
  profileDefaultName: 'Người dùng',
  // Notifications screen
  notificationsTitle: 'Thông báo',
  notifSectionLabel: 'Cài đặt thông báo',
  notifReminder: 'Nhắc nhở đo lường',
  notifReminderSub: 'Nhắc bạn đo theo lịch hàng ngày',
  notifResult: 'Kết quả đo',
  notifResultSub: 'Thông báo khi có kết quả phân tích mới',
  notifUpdate: 'Cập nhật ứng dụng',
  notifUpdateSub: 'Thông báo khi có phiên bản mới',
  notifHint: 'Thông báo sẽ được gửi theo múi giờ thiết bị của bạn.',
  // PersonalInfo screen
  personalInfoTitle: 'Thông tin cá nhân',
  comingSoon: 'Tính năng đang phát triển',
  personalInfoSub: 'Cập nhật họ tên, ảnh đại diện, ngày sinh...',
  // Security screen
  securityTitle: 'Bảo mật',
  securitySub: 'Đổi mật khẩu, xác thực 2 bước, đăng xuất tất cả thiết bị...',
  // History screen
  filterAll: 'Tất cả',
  filterFace: 'Mặt',
  filterVoice: 'Giọng nói',
  filterBp: 'Huyết áp',
  filterStress: 'Stress',
  filterSleep: 'Ngủ',
  filterFinger: 'Ngón tay',
  filterNormal: 'Bình thường',
  filterHigh: 'Cao',
  filterLow: 'Thấp',
  historyEmpty: 'Chưa có dữ liệu',
  historyEmptyHint: 'Bắt đầu đo để xem kết quả tại đây',
  historyBpm: 'BPM',
  historyJustNow: 'vừa xong',
  historyFaceHr: 'Nhịp tim qua mặt',
  historyContactHr: 'Nhịp tim tiếp xúc',
  historyStress: 'Phân tích stress',
  historyVoice: 'Phân tích giọng nói',
  historyBpVoice: 'Huyết áp qua khuôn mặt',
  historySleep: 'Phát hiện thiếu ngủ',
  historyResults: 'kết quả',
  historyLatest: 'Mới nhất',
  historyNeedImprovement: 'Cần cải thiện',
  today: 'Hôm nay',
  yesterday: 'Hôm qua',
  hours: 'giờ',
  // Home screen
  homeMeasureDetail: 'Chi tiết đo',
  homeViewHistory: 'Xem lịch sử',
  homeOverview: 'Tổng quan',
  homeScoreGood: 'Sức khoẻ tốt',
  homeComparedLastWeek: '↑ 4 điểm so với tuần trước',
  homeBloodPressureLabel: 'Huyết áp',
  homeLiveUpdate: 'Cập nhật liên tục',
  homeStartMeasure: 'Khám phá cách đo',
  homeSeeAll: 'Tất cả',
  // Settings screen
  settingsSectionAppearance: 'Giao diện',
  settingsSectionApp: 'Ứng dụng',
  settingsVersion: 'Phiên bản',
  settingsTerms: 'Điều khoản sử dụng',
  settingsPrivacy: 'Chính sách bảo mật',
  // MeasurementDetail
  measureDetailTitle: 'Chi tiết đo',
  // Chat screen
  chatOnline: 'Trực tuyến',
  chatGreeting1: 'Xin chào! Tôi là Q-Bot, trợ lý sức khỏe thông minh của bạn. Tôi có thể giúp bạn giải thích kết quả đo lường và trả lời các câu hỏi về sức khỏe. 💊',
  chatGreeting2: 'Hôm nay bạn có muốn kiểm tra chỉ số sức khỏe nào không?',
  chatQuick1: 'Nhịp tim của tôi có bình thường không?',
  chatQuick2: 'Làm sao giảm căng thẳng?',
  chatQuick3: 'Huyết áp bình thường là bao nhiêu?',
  chatPlaceholder: 'Nhập câu hỏi của bạn...',
  chatBotThinking: 'Cảm ơn bạn đã hỏi! Tôi đang xử lý câu hỏi của bạn. Vui lòng chờ trong giây lát... 🤔',
  // Language select screen
  langSelectTitle: 'Chọn ngôn ngữ',
  langSelectSubtitle: 'Bạn muốn sử dụng ứng dụng bằng ngôn ngữ nào?',
  langSelectContinue: 'Tiếp tục',
  // Onboarding slides
  onboardSlide1Title: 'Theo dõi sức khoẻ\nmọi lúc mọi nơi',
  onboardSlide1Sub: 'Đo nhịp tim, huyết áp, SpO₂ và nhiều chỉ số quan trọng khác ngay trên điện thoại của bạn.',
  onboardSlide2Title: 'Trợ lý y tế\nthông minh Q-Bot',
  onboardSlide2Sub: 'Hỏi đáp về triệu chứng, nhận lời khuyên từ AI được huấn luyện bởi các chuyên gia y tế.',
  onboardSlide3Title: 'Lịch sử & xu hướng\nsức khoẻ của bạn',
  onboardSlide3Sub: 'Xem lại toàn bộ lịch sử đo, theo dõi xu hướng và nhận cảnh báo sớm khi có bất thường.',
  onboardSkip: 'Bỏ qua',
  onboardStart: 'Bắt đầu',
  // HealthExam screen
  healthExamTitle: 'Khám Tổng Quát',
  healthExamSubtitle: '3 bước đo theo quy trình bệnh viện',
  healthExamStepFaceLabel: 'Khuôn mặt (rPPG)',
  healthExamStepFaceSub: 'Nhịp tim • Stress • Mệt mỏi',
  healthExamStepFaceInstruction: 'Nhìn thẳng vào camera. Giữ khuôn mặt trong khung hình. Đủ ánh sáng.',
  healthExamStepFaceScript: 'Sức khoẻ là tài sản quý giá nhất mà mỗi người cần trân trọng. Hãy chăm sóc cơ thể mọi ngày bằng cách ăn uống lành mạnh, ngủ đủ giấc và vận động đều đặn.',
  healthExamStepVoiceLabel: 'Huyết áp (Face BP)',
  healthExamStepVoiceSub: 'Huyết áp • Nhịp thở',
  healthExamStepVoiceInstruction: 'Giữ điện thoại ngang tầm mắt, khuôn mặt ở trong khung vuông.',
  healthExamStepVoiceScript: 'Một, hai, ba, bốn, năm, sáu, bảy, tám, chín. Một, hai, ba, bốn, năm, sáu, bảy, tám, chín.',
  healthExamStepScgLabel: 'Âm thanh tim (Beta)',
  healthExamStepScgSub: 'Bất thường tim • HRV',
  healthExamStepScgInstruction: 'Giữ điện thoại sát ngực bên trái. Ngồi yên, thở đều.',
  healthExamIntroTitle: 'Khám Tổng Quát AI',
  healthExamIntroBanner: 'Quy trình 3 bước',
  healthExamIntroBannerSub: 'Thực hiện lần lượt theo hướng dẫn',
  healthExamStartStep: (n) => `Bắt đầu bước ${n}`,
  healthExamDone: 'Hoàn tất khám!',
  healthExamDoneSub: 'Đã thu thập đủ 3 chỉ số cần thiết',
  healthExamAllData: 'Hồ sơ điện tử',
  healthExamSendGemma: 'Phân tích với Med-Gemma AI',
  healthExamGemmaHint: 'đã sẵn sàng. Nhấn để gửi cho',
  healthExamGemmaHintBold1: 'Hồ sơ điện tử',
  healthExamGemmaHintBold2: 'Med-Gemma AI',
  healthExamScript: 'Kịch bản',
  healthExamGrantCamera: 'Cấp quyền camera',
  healthExamCameraPermission: 'Cho phép truy cập camera để đo nhịp tim qua khuôn mặt',
  healthExamKeepFace: 'Giữ khuôn mặt trong khung',
  healthExamCompleted: 'Hoàn thành',
  // HealthExam measuring & step UI
  healthExamSeconds: 'giây',
  healthExamSecondsLeft: 'giây còn lại',
  // Shared measurement screen keys
  measSecondsLeft: 'giây còn lại',
  measSeconds: 'giây',
  measStartBtn: 'Bắt đầu đo',
  measStartVoice: 'Bắt đầu quét khuôn mặt đo huyết áp',
  measStartStress: 'Bắt đầu đo Stress',
  measInstructions: 'Hướng dẫn',
  measScript: 'Kịch bản sẽ đọc',
  measRecording: 'ĐANG GHI & ĐO',
  measAnalyzing: 'Đang phân tích tín hiệu...',
  measUploading: 'Đang tải video lên...',
  measFaceLocked: 'Khuôn mặt đã khóa',
  measFaceSearching: 'Đang tìm khuôn mặt...',
  measCameraActive: 'Camera trước đang hoạt động',
  measSensorInit: 'Đang khởi tạo cảm biến...',
  measRhythmNormal: '✅ Nhịp tim đều và hoàn toàn bình thường',
  measRhythmAnomaly: '⚠️ Phát hiện bất thường — nên tham khảo bác sĩ tim mạch',
  // MeasurementDetail screen
  detailInstructions: 'Hướng dẫn',
  detailStartBtn: 'Bắt đầu đo',
  healthExamRecording: 'ĐANG GHI & ĐO',
  healthExamReadScript: '📖 Đọc đoạn văn:',
  healthExamInstruction: 'Hướng dẫn thực hiện',
  healthExamStepDoneTitle: (n) => `✅ Đã đo xong bước ${n}!`,
  healthExamNextStep: 'Tiếp theo:',
  healthExamFinish: 'Hoàn tất!',
  healthExamNextLabel: (label) => `Tiếp theo: ${label}`,
  healthExamViewResults: 'Xem kết quả & Phân tích AI',
  healthExamStepOf: (cur, total) => `Bước ${cur}/${total}`,
  healthExamAnomalyFound: '⚠️ Bất thường',
  healthExamAnomalyNone: '✅ Nhịp tim đều',
  healthExamDoneInstructions: 'Đã đo xong —',
  healthExamNextStepLabel: 'Kiệch bản đọc:',
  // MedGemma report screen
  medGemmaTitle: 'MED-GEMMA AI',
  medGemmaEMR: 'EMR',
  medGemmaAnalyzing: 'Med-Gemma đang phân tích',
  medGemmaAnalyzingSub: 'Xử lý hồ sơ điện tử, so sánh với dữ liệu lâm sàng...',
  medGemmaReportTitle: 'Báo cáo Sức khoẻ AI',
  medGemmaScoreLabel: 'Điểm sức khoẻ tổng hợp',
  medGemmaBpLabel: 'Huyết áp',
  medGemmaHrLabel: 'Nhịp tim',
  medGemmaStressLabel: 'Stress',
  medGemmaRiskTitle: '⚠️ Yếu tố nguy cơ',
  medGemmaRecTitle: '💡 Khuyến nghị từ AI',
  medGemmaDisclaimer: 'Phân tích được tạo bởi Med-Gemma AI. Không thay thế chẩn đoán của bác sĩ chuyên khoa.',
  medGemmaGoHome: 'Về trang chủ',
  medGemmaRedo: 'Khám lại',
  medGemmaSend: 'Gửi cho Med-Gemma AI phân tích',
  medGemmaEMRTitle: 'Phiếu Khám Sức Khoẻ',
  medGemmaEMRDate: 'Ngày khám',
  medGemmaEMRStatus: 'Đã thu thập đủ số liệu',
  medGemmaHintText: 'Hồ sơ điện tử gồm dữ liệu từ 3 thiết bị đo đã được tổng hợp. Nhấn bên dưới để Med-Gemma AI phân tích và đưa ra cảnh báo sức khoẻ cá nhân hoá.',
  medGemmaFaceCard: 'Khuôn mặt (rPPG)',
  medGemmaVoiceCard: 'Huyết áp qua khuôn mặt',
  medGemmaScgCard: 'Âm thanh tim (Beta)',
  medGemmaLabelHr: 'Nhịp tim',
  medGemmaLabelStress: 'Stress',
  medGemmaLabelFatigue: 'Mệt mỏi',
  medGemmaLabelHrv: 'HRV',
  medGemmaLabelSysBp: 'Huyết áp tâm thu',
  medGemmaLabelDiaBp: 'Huyết áp tâm trương',
  medGemmaLabelBreathing: 'Nhịp thở',
  medGemmaLabelRhythm: 'Nhịp tim',
  medGemmaLabelAnomaly: 'Bất thường',
  medGemmaLabelAnomalyScore: 'Anomaly Score',
  medGemmaAnomalyFound: '⚠️ Phát hiện',
  medGemmaAnomalyNone: '✅ Không có',
  medGemmaBpClassLabel: 'PHÂN LOẠI HUYẾT ÁP',
  // MedGemma analysis dynamic content
  medGemmaBpStage2: 'Tăng huyết áp độ 2',
  medGemmaBpStage1: 'Tăng huyết áp độ 1',
  medGemmaBpPrehyper: 'Tiền tăng huyết áp',
  medGemmaBpLow: 'Huyết áp thấp',
  medGemmaBpNormal: 'Bình thường',
  medGemmaScoreGood: 'Tốt',
  medGemmaScoreMid: 'Trung bình',
  medGemmaScoreLow: 'Cần chú ý',
  medGemmaRiskHighBp: (cat, sys, dia) => `Huyết áp ${cat} (${sys}/${dia} mmHg) — theo dõi thường xuyên`,
  medGemmaRiskAnomaly: (rhythm) => `Phát hiện nhịp tim bất thường (${rhythm}) — nên khám tim mạch`,
  medGemmaRiskStressHigh: (pct) => `Mức stress cao (${pct}%) — nên giảm căng thẳng`,
  medGemmaRiskStressMid: (pct) => `Stress ở mức trung bình (${pct}%) — cần nghỉ ngơi`,
  medGemmaRiskHrvLow: (hrv) => `HRV thấp (${hrv}ms) — hệ thần kinh tự chủ căng thẳng`,
  medGemmaRiskNone: 'Không phát hiện yếu tố nguy cơ đáng lo ngại',
  medGemmaRecLowSalt: 'Giảm muối trong bữa ăn xuống dưới 5g/ngày',
  medGemmaRecAerobic: 'Tập thể dục aerobic nhẹ 30 phút/ngày, 5 ngày/tuần',
  medGemmaRecCardiologist: 'Tham khảo bác sĩ tim mạch để đánh giá về thuốc hạ áp',
  medGemmaRecEcg: 'Làm điện tâm đồ (ECG) và siêu âm tim trong vòng 1 tuần',
  medGemmaRecMeditate: 'Thực hành thiền định hoặc yoga 15–20 phút/ngày',
  medGemmaRecSleep: 'Đảm bảo ngủ đủ 7–8 tiếng mỗi đêm',
  medGemmaRecWater: 'Uống đủ 2–2.5 lít nước mỗi ngày',
  medGemmaRecBpMonitor: 'Theo dõi huyết áp định kỳ mỗi tuần',
  medGemmaExamDateLocale: 'vi-VN',
  // MeasurementList header
  measureListHeader: 'Khám phá cách đo',
  measureListHeaderSub: 'Chọn phương pháp phù hợp và bắt đầu',
  measureListStatDuration: 'Thời gian đo',
  measureListStatAccuracy: 'Độ chính xác',
  measureListStatDevice: 'Thiết bị ngoài',
  measureListBanner: 'Không cần thiết bị ngoài — chỉ cần camera & cảm biến điện thoại',
  measureListExamTitle: 'Khám Tổng Quát',
  measureListExamDesc: 'Khám theo trình tự • Tạo hồ sơ điện tử • AI phân tích',
  measureListSectionFeatured: 'Được đề xuất',
  measureListSectionOther: 'Phương pháp khác',
  measureListFeaturedLabel: 'Khuôn mặt (rPPG)',
  measureListFeaturedSub: 'Đo nhịp tim không tiếp xúc qua camera AI',
  measureListFeaturedTag: 'PHỔ BIẾN',
  measureListMeasureNow: 'Đo ngay',
  measureListScgLabel: 'Âm thanh tim (Beta)',
  measureListScgSub: 'Phát hiện bất thường tim',
  measureListVoiceLabel: 'Huyết áp',
  measureListVoiceSub: 'Đo huyết áp qua khuôn mặt',
  measureListStressLabel: 'Mức Stress',
  measureListStressSub: 'Đánh giá tâm lý',
  measureListSleepLabel: 'Giấc ngủ',
  measureListSleepSub: 'Phân tích chất lượng ngủ',
  measureListBadgePopular: 'PHỔ BIẾN',
  measureListBadgeAccurate: 'CHÍNH XÁC',
  measureListDisclaimer: 'Kết quả mang tính tham khảo, không thay thế chẩn đoán y tế chuyên nghiệp.',
};

const en: AppStrings = {
  splashSubtitle: 'AI health monitoring',
  navHome: 'Home',
  navHistory: 'History',
  navChat: 'Chat',
  navProfile: 'Profile',
  navSettings: 'Settings',
  loginTitle: 'Welcome Back!',
  loginSubtitle: 'Sign in to continue tracking your health',
  email: 'Email',
  password: 'Password',
  emailPlaceholder: 'Enter your email',
  passwordPlaceholder: 'Enter your password',
  forgotPassword: 'Forgot password?',
  loginButton: 'Sign in',
  noAccount: "Don't have an account?",
  registerNow: 'Register now',
  errorChatbotDefault: 'Sorry, I am having connection issues. Please try again later.',
  loginEmptyError: 'Please enter email and password',
  loginFailed: 'Login failed. Please try again.',
  registerTitle: 'Create account',
  registerSubtitle: 'Start your health journey with Q-Med',
  fullName: 'Full name',
  namePlaceholder: 'Enter your name',
  registerButton: 'Register',
  hasAccount: 'Already have an account?',
  loginNow: 'Sign in now',
  registerEmptyError: 'Please fill in all fields',
  registerFailed: 'Registration failed. Please try again.',
  homeGreeting: name => `Hi ${name}!`,
  homeQuestion: 'How are you feeling today?',
  quickActions: 'Quick actions',
  startMeasurement: 'Start measurement',
  history: 'History',
  healthAssistant: 'Health assistant',
  dashboardTitle: 'Health dashboard',
  dashboardSubtitle: 'Start a measurement to track your health metrics',
  historyTitle: 'Measurement history',
  historySubtitle: 'Track your recent measurements',
  statusNormal: 'Normal',
  statusLow: 'Low',
  chatTitle: 'AI Assistant',
  chatSubtitle: 'Ask about health and measurement indicators',
  chatBotName: 'Q-Med Bot',
  chatBotMessage:
    'Hi! I can help you understand measurement results and suggest healthy habits.',
  profileTitle: 'Profile',
  settingsTitle: 'Settings',
  lightMode: 'Light mode',
  darkMode: 'Dark mode',
  logout: 'Logout',
  language: 'Language',
  vietnamese: 'Vietnamese',
  english: 'English',
  measurementListTitle: 'Start measurement',
  measurementListSubtitle: 'Choose a measurement type',
  contactPpg: 'Contact PPG',
  contactPpgDesc: 'Place your finger on the rear camera and flash',
  faceRppg: 'Face rPPG',
  faceRppgDesc: 'Analyze heart rate using front camera',
  voice: 'Voice analysis',
  voiceDesc: 'Assess health indicators from voice',
  stress: 'Stress analysis',
  stressDesc: 'Assess your current stress level',
  sleep: 'Sleep detection',
  sleepDesc: 'Track and evaluate sleep quality',
  bloodPressure: 'Face Blood Pressure',
  bloodPressureDesc: 'Scan face to estimate blood pressure',
  measurementDuration: 'Duration',
  measurementInstructions: 'Instructions',
  measurementStart: 'Start measurement',
  measurementRunning: 'Measuring...',
  measurementCancel: 'Cancel',
  measurementAnalyzing: 'Analyzing...',
  measurementStayStill: 'Please stay still',
  resultTitle: 'Measurement result',
  heartRate: 'Heart rate',
  details: 'Details',
  detailFft: 'Heart rate (FFT)',
  detailPeak: 'Heart rate (Peak)',
  detailDuration: 'Duration',
  detailFrames: 'Frames',
  detailDetection: 'Detection',
  detected: 'Detected',
  notDetected: 'Not detected',
  resultDone: 'Done',
  measureAgain: 'Measure again',
  statusBelowNormal: 'Below normal',
  statusAboveNormal: 'Above normal',
  // Profile
  profilePageTitle: 'Profile',
  memberBadge: 'Member',
  statMeasurements: 'Measurements',
  statDays: 'Days',
  statScore: 'Score',
  profileSectionAccount: 'Account',
  profileSectionApp: 'App',
  profilePersonalInfo: 'Personal info',
  profilePersonalInfoSub: 'Name, avatar, date of birth',
  profileSecurity: 'Security',
  profileSecuritySub: 'Password, two-factor auth',
  profileNotifications: 'Notifications',
  profileNotificationsSub: 'Reminders, updates, results',
  profileHelp: 'Help & feedback',
  profileHelpSub: 'FAQ, send feedback',
  profileDefaultName: 'User',
  // Notifications screen
  notificationsTitle: 'Notifications',
  notifSectionLabel: 'Notification settings',
  notifReminder: 'Measurement reminder',
  notifReminderSub: 'Remind you to measure daily',
  notifResult: 'Measurement results',
  notifResultSub: 'Notify when new analysis result is ready',
  notifUpdate: 'App updates',
  notifUpdateSub: 'Notify when a new version is available',
  notifHint: 'Notifications will be sent in your device timezone.',
  // PersonalInfo screen
  personalInfoTitle: 'Personal info',
  comingSoon: 'Feature under development',
  personalInfoSub: 'Update name, avatar, date of birth...',
  // Security screen
  securityTitle: 'Security',
  securitySub: 'Change password, two-factor auth, sign out all devices...',
  // History screen
  filterAll: 'All',
  filterFace: 'Face',
  filterVoice: 'Voice',
  filterBp: 'Blood pressure',
  filterStress: 'Stress',
  filterSleep: 'Sleep',
  filterFinger: 'Finger',
  filterNormal: 'Normal',
  filterHigh: 'High',
  filterLow: 'Low',
  historyEmpty: 'No data yet',
  historyEmptyHint: 'Start measuring to see results here',
  historyBpm: 'BPM',
  historyJustNow: 'just now',
  historyFaceHr: 'Face heart rate',
  historyContactHr: 'Contact heart rate',
  historyStress: 'Stress analysis',
  historyVoice: 'Voice analysis',
  historyBpVoice: 'Face blood pressure',
  historySleep: 'Sleep detection',
  historyResults: 'results',
  historyLatest: 'Latest',
  historyNeedImprovement: 'Needs improvement',
  today: 'Today',
  yesterday: 'Yesterday',
  hours: 'h',
  // Home screen
  homeMeasureDetail: 'Measurement detail',
  homeViewHistory: 'View history',
  homeOverview: 'Overview',
  homeScoreGood: 'Good health',
  homeComparedLastWeek: '↑ 4 pts vs last week',
  homeBloodPressureLabel: 'Blood Pressure',
  homeLiveUpdate: 'Live updates',
  homeStartMeasure: 'Explore Measurements',
  homeSeeAll: 'See all',
  // Settings screen
  settingsSectionAppearance: 'Appearance',
  settingsSectionApp: 'Application',
  settingsVersion: 'Version',
  settingsTerms: 'Terms of use',
  settingsPrivacy: 'Privacy policy',
  // MeasurementDetail
  measureDetailTitle: 'Measurement detail',
  // Chat screen
  chatOnline: 'Online',
  chatGreeting1: 'Hello! I am Q-Bot, your smart health assistant. I can help you understand your measurement results and answer health questions. 💊',
  chatGreeting2: 'Would you like to check any health indicators today?',
  chatQuick1: 'Is my heart rate normal?',
  chatQuick2: 'How to reduce stress?',
  chatQuick3: 'What is a normal blood pressure?',
  chatPlaceholder: 'Type your question...',
  chatBotThinking: 'Thanks for asking! I am processing your question. Please wait a moment... 🤔',
  // Language select screen
  langSelectTitle: 'Choose Language',
  langSelectSubtitle: 'Which language would you like to use the app in?',
  langSelectContinue: 'Continue',
  // Onboarding slides
  onboardSlide1Title: 'Track your health\nanywhere, anytime',
  onboardSlide1Sub: 'Measure heart rate, blood pressure, SpO₂ and other vital signs right on your phone.',
  onboardSlide2Title: 'Smart medical\nassistant Q-Bot',
  onboardSlide2Sub: 'Ask about symptoms and get advice from AI trained by medical experts.',
  onboardSlide3Title: 'Your health history\n& trends',
  onboardSlide3Sub: 'Review all your measurement history, track trends and get early warnings on anomalies.',
  onboardSkip: 'Skip',
  onboardStart: 'Get started',
  // HealthExam screen
  healthExamTitle: 'General Exam',
  healthExamSubtitle: '3-step hospital-grade workflow',
  healthExamStepFaceLabel: 'Face (rPPG)',
  healthExamStepFaceSub: 'Heart rate • Stress • Fatigue',
  healthExamStepFaceInstruction: 'Look straight at the camera. Keep face in frame. Good lighting.',
  healthExamStepFaceScript: 'Health is the most precious asset. Take care of your body every day with a healthy diet, enough sleep and regular exercise.',
  healthExamStepVoiceLabel: 'Blood Pressure (Face BP)',
  healthExamStepVoiceSub: 'Blood pressure • Breathing rate',
  healthExamStepVoiceInstruction: 'Hold phone at eye level, keep your face in the frame.',
  healthExamStepVoiceScript: 'One, two, three, four, five, six, seven, eight, nine. One, two, three, four, five, six, seven, eight, nine.',
  healthExamStepScgLabel: 'Heartbeat (Beta)',
  healthExamStepScgSub: 'Heart anomaly • HRV',
  healthExamStepScgInstruction: 'Hold phone against left chest. Sit still and breathe evenly.',
  healthExamIntroTitle: 'AI General Exam',
  healthExamIntroBanner: '3-Step Workflow',
  healthExamIntroBannerSub: 'Follow each step in order',
  healthExamStartStep: (n) => `Start step ${n}`,
  healthExamDone: 'Exam complete!',
  healthExamDoneSub: 'All 3 measurements collected',
  healthExamAllData: 'Medical record',
  healthExamSendGemma: 'Analyze with Med-Gemma AI',
  healthExamGemmaHint: 'is ready. Tap to send to',
  healthExamGemmaHintBold1: 'Medical record',
  healthExamGemmaHintBold2: 'Med-Gemma AI',
  healthExamScript: 'Script',
  healthExamGrantCamera: 'Grant Camera Access',
  healthExamCameraPermission: 'Allow camera access to measure heart rate via face',
  healthExamKeepFace: 'Keep face in frame',
  healthExamCompleted: 'Completed',
  // HealthExam measuring & step UI
  healthExamSeconds: 's',
  healthExamSecondsLeft: 's remaining',
  // Shared measurement screen keys
  measSecondsLeft: 's remaining',
  measSeconds: 's',
  measStartBtn: 'Start measuring',
  measStartVoice: 'Start face scan for blood pressure',
  measStartStress: 'Start stress measurement',
  measInstructions: 'Instructions',
  measScript: 'Reading script',
  measRecording: 'RECORDING & MEASURING',
  measAnalyzing: 'Analyzing signal...',
  measUploading: 'Uploading video...',
  measFaceLocked: 'Face locked',
  measFaceSearching: 'Searching for face...',
  measCameraActive: 'Front camera active',
  measSensorInit: 'Initializing sensor...',
  measRhythmNormal: '✅ Normal and regular heartbeat',
  measRhythmAnomaly: '⚠️ Anomaly detected — consult cardiologist',
  // MeasurementDetail screen
  detailInstructions: 'Instructions',
  detailStartBtn: 'Start measuring',
  healthExamRecording: 'RECORDING & MEASURING',
  healthExamReadScript: '📖 Read aloud:',
  healthExamInstruction: 'How to perform',
  healthExamStepDoneTitle: (n) => `✅ Step ${n} done!`,
  healthExamNextStep: 'Next:',
  healthExamFinish: 'All done!',
  healthExamNextLabel: (label) => `Next: ${label}`,
  healthExamViewResults: 'View Results & AI Analysis',
  healthExamStepOf: (cur, total) => `Step ${cur}/${total}`,
  healthExamAnomalyFound: '⚠️ Anomaly',
  healthExamAnomalyNone: '✅ Normal rhythm',
  healthExamDoneInstructions: 'Done —',
  healthExamNextStepLabel: 'Reading script:',
  // MedGemma report screen
  medGemmaTitle: 'MED-GEMMA AI',
  medGemmaEMR: 'EMR',
  medGemmaAnalyzing: 'Med-Gemma is analyzing',
  medGemmaAnalyzingSub: 'Processing medical record, comparing with clinical data...',
  medGemmaReportTitle: 'AI Health Report',
  medGemmaScoreLabel: 'Overall health score',
  medGemmaBpLabel: 'Blood pressure',
  medGemmaHrLabel: 'Heart rate',
  medGemmaStressLabel: 'Stress',
  medGemmaRiskTitle: '⚠️ Risk factors',
  medGemmaRecTitle: '💡 AI Recommendations',
  medGemmaDisclaimer: 'Analysis generated by Med-Gemma AI. Does not replace specialist diagnosis.',
  medGemmaGoHome: 'Go home',
  medGemmaRedo: 'Exam again',
  medGemmaSend: 'Send to Med-Gemma AI for analysis',
  medGemmaEMRTitle: 'Health Exam Record',
  medGemmaEMRDate: 'Exam date',
  medGemmaEMRStatus: 'All data collected',
  medGemmaHintText: 'Medical record from 3 devices has been consolidated. Tap below for Med-Gemma AI to analyze and provide personalized health alerts.',
  medGemmaFaceCard: 'Face (rPPG)',
  medGemmaVoiceCard: 'Face Blood Pressure',
  medGemmaScgCard: 'Heartbeat (Beta)',
  medGemmaLabelHr: 'Heart rate',
  medGemmaLabelStress: 'Stress',
  medGemmaLabelFatigue: 'Fatigue',
  medGemmaLabelHrv: 'HRV',
  medGemmaLabelSysBp: 'Systolic BP',
  medGemmaLabelDiaBp: 'Diastolic BP',
  medGemmaLabelBreathing: 'Breathing rate',
  medGemmaLabelRhythm: 'Rhythm',
  medGemmaLabelAnomaly: 'Anomaly',
  medGemmaLabelAnomalyScore: 'Anomaly score',
  medGemmaAnomalyFound: '⚠️ Detected',
  medGemmaAnomalyNone: '✅ None',
  medGemmaBpClassLabel: 'BP CLASSIFICATION',
  // MedGemma analysis dynamic content
  medGemmaBpStage2: 'Stage 2 Hypertension',
  medGemmaBpStage1: 'Stage 1 Hypertension',
  medGemmaBpPrehyper: 'Elevated BP',
  medGemmaBpLow: 'Low Blood Pressure',
  medGemmaBpNormal: 'Normal',
  medGemmaScoreGood: 'Good',
  medGemmaScoreMid: 'Fair',
  medGemmaScoreLow: 'Needs attention',
  medGemmaRiskHighBp: (cat, sys, dia) => `${cat} (${sys}/${dia} mmHg) — monitor regularly`,
  medGemmaRiskAnomaly: (rhythm) => `Irregular heartbeat detected (${rhythm}) — consult cardiologist`,
  medGemmaRiskStressHigh: (pct) => `High stress level (${pct}%) — stress reduction needed`,
  medGemmaRiskStressMid: (pct) => `Moderate stress (${pct}%) — rest recommended`,
  medGemmaRiskHrvLow: (hrv) => `Low HRV (${hrv}ms) — autonomic nervous system under strain`,
  medGemmaRiskNone: 'No significant risk factors detected',
  medGemmaRecLowSalt: 'Reduce dietary salt to below 5g/day',
  medGemmaRecAerobic: 'Do 30 min light aerobic exercise/day, 5 days/week',
  medGemmaRecCardiologist: 'Consult a cardiologist for blood pressure medication evaluation',
  medGemmaRecEcg: 'Get an ECG and echocardiogram within 1 week',
  medGemmaRecMeditate: 'Practice meditation or yoga for 15–20 minutes/day',
  medGemmaRecSleep: 'Ensure 7–8 hours of sleep per night',
  medGemmaRecWater: 'Drink 2–2.5 liters of water per day',
  medGemmaRecBpMonitor: 'Monitor blood pressure regularly each week',
  medGemmaExamDateLocale: 'en-US',
  // MeasurementList header
  measureListHeader: 'Explore Measurements',
  measureListHeaderSub: 'Choose a method and get started',
  measureListStatDuration: 'Scan time',
  measureListStatAccuracy: 'Accuracy',
  measureListStatDevice: 'Extra devices',
  measureListBanner: 'No extra devices — just your phone’s camera & sensors',
  measureListExamTitle: 'General Exam',
  measureListExamDesc: 'Sequential exam • Electronic record • AI analysis',
  measureListSectionFeatured: 'Recommended',
  measureListSectionOther: 'Other methods',
  measureListFeaturedLabel: 'Face (rPPG)',
  measureListFeaturedSub: 'Contactless heart rate via AI camera',
  measureListFeaturedTag: 'POPULAR',
  measureListMeasureNow: 'Scan now',
  measureListScgLabel: 'Heartbeat (Beta)',
  measureListScgSub: 'Detect heart anomalies',
  measureListVoiceLabel: 'Blood Pressure',
  measureListVoiceSub: 'Measure BP via face scan',
  measureListStressLabel: 'Stress level',
  measureListStressSub: 'Psychological assessment',
  measureListSleepLabel: 'Sleep',
  measureListSleepSub: 'Sleep quality analysis',
  measureListBadgePopular: 'POPULAR',
  measureListBadgeAccurate: 'PRECISE',
  measureListDisclaimer: 'Results are indicative only and do not replace professional medical diagnosis.',
};

const map: Record<AppLanguage, AppStrings> = {
  vi,
  en,
};

export const getStrings = (lang: AppLanguage): AppStrings => map[lang];
