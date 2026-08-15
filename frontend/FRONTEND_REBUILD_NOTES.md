# Frontend Rebuild Notes

## 1. App Shell

Files:

- `App.tsx`
- `src/core/store/store.ts`
- `src/core/theme/ThemeContext.tsx`
- `src/core/i18n/LanguageContext.tsx`
- `src/core/navigation/AppNavigator.tsx`

Purpose:

- Starts the React Native app.
- Loads persisted local state.
- Provides language and theme contexts.
- Mounts the main navigation tree.
- Does not depend on login/register anymore.
- Keeps the first frontend foundation small and local-first.

Current first-run flow:

```text
LanguageSelect -> Onboarding -> MainTabs
```

Returning-user flow:

```text
MainTabs
```

## 2. Main Tabs

File:

- `src/core/navigation/AppNavigator.tsx`

Tabs:

- `Home`: health dashboard and quick overview.
- `History`: previous measurement results.
- `Measure`: central action for all health measurements.
- `QBot`: AI health assistant.
- `Settings`: language, theme, app information.

Account-specific tabs and login/register routes are no longer part of the active navigation flow.

Recommended next step:

- Build each screen UI first.
- Add local state and AsyncStorage only when the layout is stable.

## 3. Shared Components

Folder:

- `src/shared/components`

Components:

- `Button`: reusable action button with variants, loading state, disabled state, and optional icon.
- `Input`: reusable text input with label, helper text, error text, optional icon, focus border, and password visibility toggle.
- `ErrorMessage`: consistent alert box for API or validation errors.
- `LoadingSpinner`: full-screen or inline loading state.
- `Screen`: standard screen wrapper with safe area, background, optional scroll, and default padding.
- `Card`: standard bordered content container.

Rule for the next rebuild steps:

- New screens should use `Screen` as the outer layout.
- Repeated content blocks should use `Card`.
- Actions should use `Button`.
- Forms should use `Input`.
- Loading and error states should use `LoadingSpinner` and `ErrorMessage`.

## 4. What Was Kept

Existing feature screens were not rewritten in this step:

- Home
- Measurement screens
- History
- Q-Bot
- Settings content, except account logout was removed

This keeps current health measurement logic intact while the app shell is rebuilt.
