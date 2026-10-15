import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

// toggle_server.py on the PC, reached over Tailscale (the PC's Tailscale IP).
const SERVER = 'http://100.91.102.69:8765';

type Status = {
  on: boolean;
  connected: boolean;
  location: [number, number] | null;
  note: string;
  // What the PC's Tailscale sees about this iPhone.
  tailscale: { pc: string; phone_online: boolean; path: string };
};

async function call(path: string, method: 'GET' | 'POST', timeoutMs: number): Promise<Status> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(SERVER + path, { method, signal: controller.signal });
    if (!res.ok) throw new Error(`PC answered ${res.status}`);
    return (await res.json()) as Status;
  } finally {
    clearTimeout(timer);
  }
}

export default function App() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setStatus(await call('/status', 'GET', 5000));
      setError(null);
    } catch {
      setError(`Can't reach the PC at ${SERVER}. Is toggle_server.py running and Tailscale on?`);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, [refresh]);

  const toggle = async () => {
    if (!status || busy) return;
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      // Turning off waits for the PC to restore real GPS, so allow longer.
      setStatus(await call(status.on ? '/off' : '/on', 'POST', 20000));
      setError(null);
    } catch {
      setError(`Can't reach the PC at ${SERVER}.`);
    } finally {
      setBusy(false);
    }
  };

  const on = status?.on ?? false;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fake location</Text>

      <Pressable
        onPress={toggle}
        disabled={!status || busy}
        style={({ pressed }) => [
          styles.button,
          on ? styles.buttonOn : styles.buttonOff,
          (!status || busy) && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
      >
        {busy ? (
          <ActivityIndicator color="#fff" size="large" />
        ) : (
          <Text style={styles.buttonText}>{on ? 'ON' : 'OFF'}</Text>
        )}
      </Pressable>

      <Text style={styles.note}>{status?.note ?? 'Connecting to PC...'}</Text>
      {status?.location && (
        <Text style={styles.location}>
          {status.location[0].toFixed(6)}, {status.location[1].toFixed(6)}
        </Text>
      )}
      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.tailscale}>
        <View
          style={[
            styles.dot,
            error ? styles.dotRed : status?.tailscale.phone_online ? styles.dotGreen : styles.dotGray,
          ]}
        />
        <View style={styles.tailscaleText}>
          <Text style={styles.tailscaleTitle}>Tailscale</Text>
          <Text style={styles.tailscaleDetail}>
            {error
              ? 'PC not reachable over Tailscale'
              : status
                ? `PC ${status.tailscale.pc} · iPhone ${
                    status.tailscale.phone_online ? 'online' : 'offline'
                  } · ${status.tailscale.path}`
                : 'Checking...'}
          </Text>
        </View>
      </View>

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 48,
  },
  button: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonOn: {
    backgroundColor: '#34c759',
  },
  buttonOff: {
    backgroundColor: '#8e8e93',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  buttonText: {
    color: '#fff',
    fontSize: 44,
    fontWeight: '700',
  },
  note: {
    marginTop: 40,
    fontSize: 17,
    textAlign: 'center',
  },
  location: {
    marginTop: 8,
    fontSize: 15,
    color: '#8e8e93',
    fontVariant: ['tabular-nums'],
  },
  error: {
    marginTop: 24,
    fontSize: 15,
    color: '#ff3b30',
    textAlign: 'center',
  },
  tailscale: {
    position: 'absolute',
    bottom: 48,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#f2f2f7',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotGreen: {
    backgroundColor: '#34c759',
  },
  dotGray: {
    backgroundColor: '#8e8e93',
  },
  dotRed: {
    backgroundColor: '#ff3b30',
  },
  tailscaleText: {
    flex: 1,
  },
  tailscaleTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  tailscaleDetail: {
    fontSize: 13,
    color: '#8e8e93',
    marginTop: 2,
  },
});
