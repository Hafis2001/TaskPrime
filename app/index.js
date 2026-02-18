import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Animated, Image, StyleSheet } from "react-native";
import LicenseActivationScreen from "../src/screens/LicenseActivationScreen";
import LoginScreen from "../src/screens/LoginScreen";

SplashScreen.preventAutoHideAsync(); // Keep splash visible

export default function Index() {
  const [appReady, setAppReady] = useState(false);
  const [licenseActivated, setLicenseActivated] = useState(false);
  const [isAddingLicense, setIsAddingLicense] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0)); // For fade animation

  useEffect(() => {
    const prepare = async () => {
      try {
        // Check license status
        const isActivated = await AsyncStorage.getItem("licenseActivated");
        setLicenseActivated(isActivated === "true");

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

  if (!appReady) {
    // Show gradient splash with fade
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
    width: 200,
    height: 200,
  },
});
