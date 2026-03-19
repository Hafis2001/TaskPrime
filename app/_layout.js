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

const ExpiredLicenseOverlay = () => {
    const insets = useSafeAreaInsets();
    const { demoInfo, licenseValidity, isRegularExpired } = useLicenseModules();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await AsyncStorage.multiRemove([
                "user",
                "authToken",
                "loginTimestamp"
            ]);
            router.replace("/");
        } catch (e) {
            console.error("Logout failed", e);
        }
    };

    const companyName = isRegularExpired ? "Your Account" : (demoInfo?.company || "Your Demo Account");
    const expiryDate = isRegularExpired ? licenseValidity?.expiry_date : demoInfo?.expires_at;

    return (
        <View style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            zIndex: 9999,
            justifyContent: 'center',
            alignItems: 'center',
            padding: Spacing.xl
        }}>
            <View style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: Colors.error.bg,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: Spacing.xl
            }}>
                <Ionicons name="alert-circle" size={60} color={Colors.error.main} />
            </View>
            
            <Text style={{
                fontSize: Typography.fontSize['2xl'],
                fontWeight: Typography.fontWeight.bold,
                color: Colors.dark.main,
                textAlign: 'center',
                marginBottom: Spacing.md
            }}>
                License Expired
            </Text>
            
            <Text style={{
                fontSize: Typography.fontSize.base,
                color: Colors.text.secondary,
                textAlign: 'center',
                marginBottom: Spacing['2xl'],
                lineHeight: 22
            }}>
                Your license for {companyName} expired on {expiryDate}. 
                Please contact support to renew your license.
            </Text>

            <TouchableOpacity 
                onPress={handleLogout}
                style={{
                    backgroundColor: Colors.primary.main,
                    paddingVertical: Spacing.md,
                    paddingHorizontal: Spacing['2xl'],
                    borderRadius: 12,
                    shadowColor: Colors.primary.main,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4
                }}
            >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                    Switch Account / Logout
                </Text>
            </TouchableOpacity>
        </View>
    );
};

import { StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

export default function RootLayout() {
  const { isDemoExpired, isRegularExpired } = useLicenseModules();
  const isExpired = isDemoExpired || isRegularExpired;

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <StatusBar style="auto" />
        <DemoBanner />
        {isExpired && <ExpiredLicenseOverlay />}
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
