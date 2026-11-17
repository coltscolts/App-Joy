import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import * as Cal from './calendar';
import * as Notif from './notifications';

// App nativa "Mando": muestra la oficina web y le da acceso al Calendario de Apple,
// avisos con la app cerrada y apertura de Outlook/Teams/Correo.
const WEB_URL: string = process.env.EXPO_PUBLIC_WEB_URL || (Constants.expoConfig?.extra?.webUrl as string) || 'https://app.joyplann.com/oficina/';
const ORIGIN = new URL(WEB_URL).origin;
// Dominios de inicio de sesión que deben abrirse dentro de la app.
const IN_APP_HOSTS = [/(^|\.)clerk\./, /clerk\.accounts\.dev$/, /(^|\.)joyplann\.com$/];

type Msg = { id: string; type: string; [k: string]: unknown };

export default function App() {
  const web = useRef<WebView>(null);
  const [error, setError] = useState(false);

  const reply = useCallback((id: string, ok: boolean, data: unknown) => {
    const js = `window.__mandoNativeReply && window.__mandoNativeReply(${JSON.stringify(id)}, ${ok}, ${JSON.stringify(data ?? null)}); true;`;
    web.current?.injectJavaScript(js);
  }, []);

  const onMessage = useCallback(async (e: WebViewMessageEvent) => {
    // Solo se atienden mensajes de la página de la empresa, nunca de otro sitio.
    if (!e.nativeEvent.url.startsWith(ORIGIN)) return;
    let msg: Msg;
    try { msg = JSON.parse(e.nativeEvent.data); } catch { return; }
    try {
      switch (msg.type) {
        case 'calendar.permission': return reply(msg.id, true, await Cal.permission());
        case 'calendar.list': return reply(msg.id, true, await Cal.listCalendars());
        case 'calendar.events':
          return reply(msg.id, true, await Cal.events(String(msg.from), String(msg.to), (msg.calendarIds as string[] | null) ?? null));
        case 'calendar.add':
          return reply(msg.id, true, await Cal.addEvent(msg as unknown as Parameters<typeof Cal.addEvent>[0]));
        case 'notifications.sync':
          return reply(msg.id, true, await Notif.sync(msg.items as Parameters<typeof Notif.sync>[0]));
        case 'share':
          await Share.share({ message: String(msg.text ?? ''), title: msg.title ? String(msg.title) : undefined });
          return reply(msg.id, true, null);
        case 'openUrl':
          await Linking.openURL(String(msg.url));
          return reply(msg.id, true, null);
        case 'keepAwake':
          if (msg.on) await activateKeepAwakeAsync('recording'); else deactivateKeepAwake('recording');
          return reply(msg.id, true, null);
        default:
          return reply(msg.id, false, `Acción desconocida: ${msg.type}`);
      }
    } catch (err) {
      reply(msg.id, false, err instanceof Error ? err.message : String(err));
    }
  }, [reply]);

  // Ligas externas (Teams, Outlook, mailto, sitios) se abren en su app.
  const onShouldStart = useCallback((req: ShouldStartLoadRequest) => {
    const url = req.url;
    if (url.startsWith(ORIGIN) || url.startsWith('about:') || url.startsWith('blob:') || url.startsWith('data:')) return true;
    // Marcos internos (p. ej. verificación de inicio de sesión) se quedan en la app.
    if (/^https?:/.test(url) && req.isTopFrame === false) return true;
    try {
      if (/^https?:/.test(url) && IN_APP_HOSTS.some((r) => r.test(new URL(url).hostname))) return true;
    } catch { /* esquema sin host (mailto:, ms-outlook:) */ }
    void Linking.openURL(url).catch(() => {});
    return false;
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <SafeAreaView style={styles.root} edges={['top']}>
        {error ? (
          <View style={styles.center}>
            <Text style={styles.title}>Sin conexión</Text>
            <Text style={styles.text}>Revisa tu internet e inténtalo de nuevo.</Text>
            <Pressable style={styles.button} onPress={() => { setError(false); web.current?.reload(); }}>
              <Text style={styles.buttonText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : (
          <WebView
            ref={web}
            source={{ uri: WEB_URL }}
            originWhitelist={['*']}
            onMessage={onMessage}
            onShouldStartLoadWithRequest={onShouldStart}
            onOpenWindow={(e) => { void Linking.openURL(e.nativeEvent.targetUrl).catch(() => {}); }}
            onError={() => setError(true)}
            injectedJavaScriptBeforeContentLoaded={'window.__MANDO_NATIVE__ = { platform: "ios" }; true;'}
            sharedCookiesEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            mediaCapturePermissionGrantType="grant"
            allowsBackForwardNavigationGestures
            allowsLinkPreview={false}
            pullToRefreshEnabled={false}
            decelerationRate="normal"
            startInLoadingState
            renderLoading={() => <View style={styles.center}><ActivityIndicator size="large" color="#ea580c" /></View>}
            style={styles.web}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f6f3' },
  web: { flex: 1, backgroundColor: '#f6f6f3' },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f6f6f3' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 6, color: '#111418' },
  text: { fontSize: 15, color: '#666a70', textAlign: 'center' },
  button: { marginTop: 16, backgroundColor: '#ea580c', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
