import {useNavigation} from '@react-navigation/native';
import {useCallback} from 'react';

/**
 * Returns a safe goBack function that:
 * - Calls navigation.goBack() if there is a screen to go back to
 * - Falls back to navigating to 'Home' tab otherwise (prevents the
 *   "GO_BACK was not handled" error when a screen is opened as root)
 */
export function useSafeGoBack(fallback: string = 'Home') {
  const navigation = useNavigation<any>();
  return useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(fallback);
    }
  }, [navigation, fallback]);
}
