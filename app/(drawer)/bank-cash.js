import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLicenseModules } from "../../src/utils/useLicenseModules";

import ModernCard from "../../components/ui/ModernCard";
import ModernHeader from "../../components/ui/ModernHeader";
import { BorderRadius, Colors, Shadows, Spacing, Typography } from "../../constants/modernTheme";

const { width } = Dimensions.get("window");

export default function BankCashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { checkModule, hasModule } = useLicenseModules();

  const [isLicensed, setIsLicensed] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const runCheck = async () => { setIsLicensed(null);
        const hasBank = await hasModule("MOD020");
        const hasCash = await hasModule("MOD019");

        if (!hasBank && !hasCash) {
          setIsLicensed(false);
          // Standardizing with a slight delay for reliability
          setTimeout(() => {
            Alert.alert(
              "Module Not Purchased",
              'You have not purchased the "Bank & Cash" module. Please contact your administrator to activate it.',
              [{ text: "OK", onPress: () => router.push("/(drawer)/(tabs)") }]
            );
          }, 300);
          return;
        }
        setIsLicensed(true);
      };
      runCheck();

      const backAction = () => {
        router.push("/(drawer)/(tabs)");
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction
      );

      return () => backHandler.remove();
    }, [])
  );

  if (isLicensed === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background.secondary }}>
        <ActivityIndicator size="large" color={Colors.primary.main} />
      </View>
    );
  }
  if (!isLicensed) return null;

  const MenuCard = ({ title, subtitle, icon, colors, onPress }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.cardContainer}
    >
      <ModernCard style={styles.card} elevated={false}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={32} color="#fff" />
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardSubtitle}>{subtitle}</Text>
          </View>

          <View style={styles.arrowWrap}>
            <Ionicons
              name="chevron-forward"
              size={24}
              color="rgba(255,255,255,0.8)"
            />
          </View>
        </LinearGradient>
      </ModernCard>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ModernHeader
        title="Accounts"
        leftIcon={<Ionicons name="arrow-back" size={24} color={Colors.primary.main} />}
        onLeftPress={() => router.push("/(drawer)/(tabs)")}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>
          Quick access to your financial books
        </Text>

        <View style={styles.cardsWrapper}>
          <MenuCard
            title="Bank Book"
            subtitle="View bank details & ledgers"
            icon="card-outline"
            colors={["#4e73df", "#224abe"]}
            onPress={async () => { if (await checkModule("MOD020", "Bank Book")) router.push("bankBook"); }}
          />

          <MenuCard
            title="Cash Book"
            subtitle="Cash summary & transactions"
            icon="cash-outline"
            colors={["#1cc88a", "#13855c"]}
            onPress={async () => { if (await checkModule("MOD019", "Cash Book")) router.push("cashBook"); }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  content: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  cardsWrapper: {
    gap: Spacing.lg,
  },
  cardContainer: {
    marginBottom: Spacing.md,
  },
  card: {
    padding: 0,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.md,
  },
  cardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xl,
    minHeight: 120,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    marginRight: Spacing.lg,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    color: "#fff",
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 4,
  },
  cardSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  arrowWrap: {
    marginLeft: Spacing.sm,
  },
});

