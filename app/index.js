import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Animated, Image, StyleSheet } from "react-native";
import LicenseActivationScreen from "../src/screens/LicenseActivationScreen";
import LoginScreen from "../src/screens/LoginScreen";
import { moderateScale } from "../src/utils/Responsive";

SplashScreen.preventAutoHideAsync(); // Keep splash visible

// Session valid for 20 hours (token expires at 24h, so 20h gives a safe margin)
const SESSION_DURATION_MS = 20 * 60 * 60 * 1000;

export default function Index() {
  const router = useRouter();
  const [appReady, setAppReady] = useState(false);
  const [licenseActivated, setLicenseActivated] = useState(false);
  const [isAddingLicense, setIsAddingLicense] = useState(false);
  const [sessionValid, setSessionValid] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0)); // For fade animation

  useEffect(() => {
    const prepare = async () => {
      try {
        // Check license status
        const isActivated = await AsyncStorage.getItem("licenseActivated");
        setLicenseActivated(isActivated === "true");

        // Check if an existing session is still valid (< 20 hours old)
        if (isActivated === "true") {
          const [storedUser, storedTimestamp] = await Promise.all([
            AsyncStorage.getItem("user"),
            AsyncStorage.getItem("loginTimestamp"),
          ]);

          if (storedUser && storedTimestamp) {
            const elapsed = Date.now() - parseInt(storedTimestamp, 10);
            if (elapsed < SESSION_DURATION_MS) {
              setSessionValid(true);
            }
          }
        }

        // Simulate loading tasks (fonts, auth, etc.)
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (e) {
        console.warn(e);
      } finally {
        // Animate fade-in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start(() => {
          SplashScreen.hideAsync();
          setAppReady(true);
        });
      }
    };

    prepare();
  }, []);

  // Once ready, if session is valid, skip login and go straight to main app
  useEffect(() => {
    if (appReady && licenseActivated && sessionValid) {
      router.replace("/(drawer)/(tabs)");
    }
  }, [appReady, licenseActivated, sessionValid]);

  const handleActivationSuccess = () => {
    setIsAddingLicense(false);
    setLicenseActivated(true);
  };

  const handleAddLicense = () => {
    setIsAddingLicense(true);
    setLicenseActivated(false);
  };

  const handleCancelActivation = () => {
    setIsAddingLicense(false);
    setLicenseActivated(true);
  };

  if (!appReady || (licenseActivated && sessionValid)) {
    // Show gradient splash while loading or while navigating away (valid session)
    return (
      <LinearGradient
        colors={["#ffffff", "#ff6600"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.container}
      >
        <Animated.View style={[styles.logoContainer, { opacity: fadeAnim }]}>
          <Image
            source={require("../assets/images/taskprime1.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      </LinearGradient>
    );
  }

  if (!licenseActivated) {
    return (
      <LicenseActivationScreen
        onActivationSuccess={handleActivationSuccess}
        onCancel={handleCancelActivation}
        isAddingNew={isAddingLicense}
      />
    );
  }

  return <LoginScreen onAddLicense={handleAddLicense} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: moderateScale(200),
    height: moderateScale(200),
  },
});
