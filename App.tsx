import { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

// toggle_server.py, reached over Tailscale: the Linux server (hyperinstance) first, then the PC
// (main-node). MagicDNS names keep working if a Tailscale IP changes; the IPs are fallbacks in
// case Tailscale DNS is off on the iPhone. The last address that answered is tried first.
const SERVERS = [
  'http://hyperinstance.tailfe09af.ts.net:8765',
  'http://100.93.31.113:8765',
  'http://main-node.tailfe09af.ts.net:8765',
  'http://100.91.102.69:8765',
];
const UNREACHABLE =
  "Can't reach the Moon Walk server (hyperinstance or main-node). Is toggle_server.py running and Tailscale on?";

// Radius choices for the -/+ buttons, in meters.
const RADII = [5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];

type Status = {
  on: boolean;
  connected: boolean;
  location: [number, number] | null;
  note: string;
  radius: number;
  // What the server's Tailscale sees about this iPhone.
  tailscale: { pc: string; phone_online: boolean; phone_ip: string | null; path: string };
};

let working = 0; // index into SERVERS of the address that answered last

async function call(path: string, method: 'GET' | 'POST', timeoutMs: number, body?: object): Promise<Status> {
  let lastError: unknown;
  for (let i = 0; i < SERVERS.length; i++) {
    const index = (working + i) % SERVERS.length;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(SERVERS[index] + path, {
        method,
        signal: controller.signal,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(`Server answered ${res.status}`);
      working = index;
      return (await res.json()) as Status;
    } catch (e) {
      lastError = e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

function stepRadius(radius: number, direction: 1 | -1): number {
  const next =
    direction > 0 ? RADII.find((r) => r > radius) : [...RADII].reverse().find((r) => r < radius);
  return next ?? radius;
}

export default function App() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [radius, setRadius] = useState<number | null>(null); // null until the server tells us its last radius

  const polling = useRef(false); // trying every address can outlast the 2 s poll, so don't overlap

  const refresh = useCallback(async () => {
    if (polling.current) return;
    polling.current = true;
    try {
      const s = await call('/status', 'GET', 4000);
      setStatus(s);
      setRadius((r) => r ?? s.radius);
      setError(null);
    } catch {
      setError(UNREACHABLE);
    } finally {
      polling.current = false;
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
      // Turning off waits for the server to restore real GPS, so allow longer.
      const s = status.on
        ? await call('/off', 'POST', 20000)
        : await call('/on', 'POST', 20000, radius ? { radius } : undefined);
      setStatus(s);
      setError(null);
    } catch {
      setError(UNREACHABLE);
    } finally {
      setBusy(false);
    }
  };

  const on = status?.on ?? false;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Moon Walk</Text>

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

      <View style={styles.radiusRow}>
        <Pressable
          onPress={() => radius && setRadius(stepRadius(radius, -1))}
          disabled={on || !radius || radius <= RADII[0]}
          hitSlop={8}
          style={({ pressed }) => [styles.stepper, pressed && styles.buttonPressed]}
        >
          <Text style={[styles.stepperText, (on || !radius || radius <= RADII[0]) && styles.stepperDisabled]}>−</Text>
        </Pressable>
        <View style={styles.radiusValue}>
          <Text style={styles.radiusNumber}>{radius === null ? '–' : `${radius} m`}</Text>
          <Text style={styles.radiusLabel}>{on ? 'radius · turn OFF to change' : 'radius'}</Text>
        </View>
        <Pressable
          onPress={() => radius && setRadius(stepRadius(radius, 1))}
          disabled={on || !radius || radius >= RADII[RADII.length - 1]}
          hitSlop={8}
          style={({ pressed }) => [styles.stepper, pressed && styles.buttonPressed]}
        >
          <Text
            style={[
              styles.stepperText,
              (on || !radius || radius >= RADII[RADII.length - 1]) && styles.stepperDisabled,
            ]}
          >
            +
          </Text>
        </Pressable>
      </View>

      <Text style={styles.note}>{status?.note ?? 'Connecting to server...'}</Text>
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
              ? 'Server not reachable over Tailscale'
              : status
                ? `Server ${status.tailscale.pc} · iPhone ${
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
  radiusRow: {
    marginTop: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  stepper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f2f2f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    fontSize: 28,
    fontWeight: '500',
    color: '#007aff',
  },
  stepperDisabled: {
    color: '#c7c7cc',
  },
  radiusValue: {
    alignItems: 'center',
    minWidth: 120,
  },
  radiusNumber: {
    fontSize: 24,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  radiusLabel: {
    fontSize: 13,
    color: '#8e8e93',
    marginTop: 2,
  },
  note: {
    marginTop: 28,
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
