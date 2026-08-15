# Q-Med Mobile App (Expo)

React Native Expo frontend for Q-Med AI Health Monitoring application.

## ✅ Completed Features

- **Authentication** - Login, Register với JWT tokens
- **Redux Toolkit** - State management với persist
- **React Navigation** - Stack + Bottom tabs navigation  
- **Theme System** - Light/Dark mode toggle
- **Home Dashboard** - Welcome screen
- **Profile** - User info, logout, theme toggle
- **History** - Measurement history placeholder
- **Chatbot** - AI assistant placeholder

## 🚧 Pending

- Measurement screens (Contact PPG, Face rPPG, Sleep)
- Camera integration for Face rPPG (Completed)
- Accelerometer integration for SCG (Completed)
- Charts for health data
- Full chatbot implementation

## Tech Stack

- **Expo** ~55.0.8
- **React Native** 0.83.2
- **TypeScript** ~5.9.2
- **Redux Toolkit** ^2.11.2 + Redux Persist
- **React Navigation** ^7.1.34
- **Axios** ^1.13.6
- **AsyncStorage** ^3.0.1

## Quick Start

### Installation

```bash
cd frontend-expo
npm install
```

### Run App

**Web (Tested ✅):**
```bash
npx expo start --web
# Opens at http://localhost:8081
```

**Mobile:**
```bash
npx expo start
# Scan QR code with Expo Go app
# Or press 'a' for Android, 'i' for iOS
```

**Android:**
```bash
npx expo start --android
```

**iOS (macOS only):**
```bash
npx expo start --ios
```

## Project Structure

```
frontend-expo/
├── App.tsx              # Root component with Redux + Navigation
├── src/
│   ├── core/
│   │   ├── api/         # API services (axios, authService, chatService)
│   │   ├── store/       # Redux store + slices (auth, user, measurement, chat)
│   │   ├── navigation/  # React Navigation config
│   │   └── theme/       # Theme system (light/dark)
│   ├── features/        # Feature modules
│   │   ├── auth/        # Login, Register, Splash
│   │   ├── home/        # Dashboard
│   │   ├── profile/     # User profile
│   │   ├── history/     # Measurement history
│   │   └── chatbot/     # AI chat
│   └── shared/
│       └── components/  # Reusable UI (Button, Input, etc.)
└── package.json
```

## Tích hợp Backend (Backend Integration)

Đảm bảo FastAPI backend đang chạy:

```bash
cd ../backend
make dev  # hoặc: docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

**URL API mặc định (Local):**
- Web: `http://localhost:6789/api`
- Android: `http://10.0.2.2:6789/api`
- iOS: `http://localhost:6789/api`

### Hướng dẫn cấu hình kết nối Backend URL tùy chỉnh (Ví dụ: VPS)

Nếu bạn muốn App kết nối tới một server backend ở xa (chẳng hạn máy chủ thật có GPU), bạn thay đổi qua biến `EXPO_PUBLIC_API_URL`.

**Cách 1: Chạy trực tiếp qua dòng lệnh (nhanh nhất)**

Trên Windows (PowerShell):
```powershell
$env:EXPO_PUBLIC_API_URL="http://<IP_SERVER_CỦA_BẠN>:6789/api"; npx expo start --clear
```

Trên Mac/Linux:
```bash
EXPO_PUBLIC_API_URL="http://<IP_SERVER_CỦA_BẠN>:6789/api" npx expo start --clear
```

**Cách 2: Sử dụng file `.env` (tiện dụng lâu dài)**

1. Tạo một file tên là `.env` ngay trong thư mục `frontend/` (song song với `package.json`).
2. Ghi nội dung này vào file `.env`:
   ```env
   EXPO_PUBLIC_API_URL=http://<IP_SERVER_CỦA_BẠN>:6789/api
   ```
3. Khởi động lại dự án, tự động nó sẽ bắt URL này:
   ```bash
   npx expo start --clear
   ```
*(Lưu ý: Luôn dùng hậu tố `--clear` để Expo xóa bộ nhớ đệm và đổi API URL thành công).*

## Available Commands

- `npx expo start` - Start dev server
- `npx expo start --web` - Start web version
- `npx expo start --android` - Start Android
- `npx expo start --ios` - Start iOS
- `npm run web` - Alias for web
- `npm run android` - Alias for Android
- `npm run ios` - Alias for iOS

## Testing

**Web:** ✅ Tested and working
- Navigation works
- Theme toggle works
- Accelerometer (SCG) mock works gracefully on Web

**Mobile:** ✅ Tested inside iOS/Android
- Face rPPG uses real Camera to capture and upload `/api/rppg/analyse`.
- Step SCG uses real `expo-sensors/Accelerometer` Z-axis 12.5Hz sampling and uploads to `/api/scg/analyze`.
- Step Voice API uses Mock generation (with Estimated AI label).

## Notes

- Replaced React Native CLI with Expo for faster development
- Web version runs perfectly without emulator
- All core infrastructure complete
- Ready for measurement feature implementation

## Next Steps

1. Implement measurement screens
2. Add camera integration (expo-camera)
3. Integrate charts (victory-native or react-native-svg-charts)
4. Complete chatbot UI
5. Test on mobile devices
