// Native Google account sheet → ID token. Lazy import so Expo Go / web (no native module) fail on tap, not on screen load.
export async function signInWithGoogle(): Promise<string | null> {
  // Expo Go has no native Google module: the import itself throws there.
  const mod = await import('@react-native-google-signin/google-signin').catch(() => null);
  if (!mod) throw new Error('Google sign-in is not available in Expo Go. Use email and password here.');
  const { GoogleSignin } = mod;
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });
  await GoogleSignin.hasPlayServices();
  const res = await GoogleSignin.signIn();
  if (res.type === 'cancelled') return null;
  if (!res.data.idToken) throw new Error('Google did not return an ID token');
  return res.data.idToken;
}
