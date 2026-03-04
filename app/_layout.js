// app/_layout.js (ROOT LAYOUT)
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing, Typography } from "../constants/modernTheme";
import { useLicenseModules } from "../src/utils/useLicenseModules";

const DemoBanner = () => {
  const insets = useSafeAreaInsets();
  const { demoInfo } = useLicenseModules();

  if (!demoInfo) return null;

  const expiryDate = new Date(demoInfo.expires_at);
  const today = new Date();
  const diffTime = expiryDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return (
    <View style={{
      backgroundColor: Colors.warning.bg,
      paddingTop: insets.top + Spacing.xs,
      paddingBottom: Spacing.xs,
      paddingHorizontal: Spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: Colors.warning.light,
      alignItems: 'center',
      zIndex: 100
    }}>
      <Text style={{
        color: Colors.warning.dark,
        fontWeight: Typography.fontWeight.bold,
        fontSize: Typography.fontSize.xs,
        textTransform: 'uppercase'
      }}>
        ⚠️ Demo License Active ({demoInfo.expires_at})
      </Text>
      {diffDays >= 0 && (
        <Text style={{
          color: Colors.warning.dark,
          fontSize: 10,
          marginTop: 2
        }}>
          Expires within {diffDays} {diffDays === 1 ? 'day' : 'days'}
        </Text>
      )}
    </View>
  );
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <StatusBar style="auto" />
        <DemoBanner />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(drawer)" />
          <Stack.Screen name="bankBook" />
          <Stack.Screen name="bank-ledger" />
          <Stack.Screen name="cashBook" />
          <Stack.Screen name="cash-ledger" />
        </Stack>
      </View>
    </SafeAreaProvider>
  );
}
