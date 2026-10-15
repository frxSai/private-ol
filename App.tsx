import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function App() {
  const [count, setCount] = useState(0);

  const handlePress = () => {
    setCount((c) => c + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.count}>{count}</Text>
      <Text style={styles.label}>{count === 1 ? 'click' : 'clicks'}</Text>

      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonText}>Click me</Text>
      </Pressable>

      <Pressable onPress={() => setCount(0)} hitSlop={12}>
        <Text style={styles.reset}>Reset</Text>
      </Pressable>

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
  },
  count: {
    fontSize: 96,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: 18,
    color: '#8e8e93',
    marginBottom: 48,
  },
  button: {
    backgroundColor: '#007aff',
    paddingVertical: 18,
    paddingHorizontal: 56,
    borderRadius: 16,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  buttonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
  },
  reset: {
    marginTop: 24,
    fontSize: 16,
    color: '#007aff',
  },
});
