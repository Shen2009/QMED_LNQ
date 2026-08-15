# Q-Med Frontend

Expo React Native frontend skeleton for Q-Med.

## Current Features

- App shell with Redux Persist
- Language provider
- Theme provider
- Bottom tab navigation
- Shared components: Button, Input, Card, Screen, ErrorMessage, LoadingSpinner
- Clean placeholder screens:
  - Home
  - Measure
  - History
  - Q-Bot
  - Settings

## Project Structure

```text
src/
├── core/
│   ├── api/
│   ├── i18n/
│   ├── navigation/
│   ├── store/
│   └── theme/
├── features/
│   ├── history/
│   ├── home/
│   ├── measure/
│   ├── onboarding/
│   ├── qbot/
│   └── settings/
└── shared/
    └── components/
```

## Run

```bash
npm install
npx expo start
```

## Rebuild Rule

Build the UI first. Keep each feature in its own folder. Add real data or API
logic only after the screen layout is stable.
