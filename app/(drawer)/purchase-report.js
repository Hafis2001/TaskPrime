import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  StyleSheet,
  Text,
  View
} from "react-native";
import RNPickerSelect from "react-native-picker-select";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ModernCard from "../../components/ui/ModernCard";
import ModernHeader from "../../components/ui/ModernHeader";
import { BorderRadius, Colors, Shadows, Spacing, Typography } from "../../constants/modernTheme";
import { useLicenseModules } from "../../src/utils/useLicenseModules";

const API_URLS = {
  today: "https://taskprime.app/api/purchasetoday/",
  month: "https://taskprime.app/api/purchasemonth/",
  overall: "https://taskprime.app/api/purchaseoverall/",
};

export default function PurchaseReportScreen() {
  const [loading, setLoading] = useState(true);
  const [selectedSummary, setSelectedSummary] = useState("today");
  const [purchaseData, setPurchaseData] = useState([]);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { checkModule } = useLicenseModules();
  const [isLicensed, setIsLicensed] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const runCheck = async () => { setIsLicensed(null);
        const allowed = await checkModule("MOD038", "Purchase Report", () => {
          router.push("/(drawer)/(tabs)");
        });

        if (!allowed) {
          setIsLicensed(false);
          return;
        }
        setIsLicensed(true);
        const storedUser = await AsyncStorage.getItem("user");
        if (!storedUser) {
          router.replace("/");
          return;
        }
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        fetchReport(parsedUser, selectedSummary);
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
    }, [selectedSummary])
  );

  const fetchReport = async (parsedUser, type) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URLS[type]}?client_id=${parsedUser.clientId}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${parsedUser.token}`,
          },
        }
      );
      const json = await response.json();

      if (json.success && Array.isArray(json.data)) {
        setPurchaseData(json.data);
      } else if (json.data) {
        setPurchaseData([json.data]);
      } else {
        setPurchaseData([]);
      }
    } catch (error) {
      console.error("âŒ Fetch error:", error);
      setPurchaseData([]);
    } finally {
      setLoading(false);
    }
  };

  if (isLicensed === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background.secondary }}>
        <ActivityIndicator size="large" color={Colors.primary.main} />
      </View>
    );
  }
  if (!isLicensed) return null;

  const totalPurchase = purchaseData.reduce(
    (sum, item) => sum + parseFloat(item.nettotal || 0),
    0
  );

  const renderItem = ({ item }) => (
    <ModernCard style={styles.transactionCard} elevated={false}>
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <View style={styles.iconCircle}>
            <Ionicons name="cart-outline" size={20} color={Colors.primary.main} />
          </View>
          <View style={styles.infoContainer}>
            <Text style={styles.name} numberOfLines={1}>{item.suppliername}</Text>
            <Text style={styles.time}>Bill No: {item.billno}</Text>
          </View>
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.amount} numberOfLines={1}>
            â‚¹{parseFloat(item.nettotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </Text>
        </View>
      </View>
    </ModernCard>
  );

  return (
    <View style={styles.container}>
      <ModernHeader
        title="Purchase Report"
        leftIcon={<Ionicons name="arrow-back" size={26} color={Colors.primary.main} />}
        onLeftPress={() => router.push("/(drawer)/(tabs)")}
      />

      <View style={styles.content}>
        {/* Dropdown */}
        <LinearGradient
          colors={[Colors.primary.main, Colors.primary.light]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientBox}
        >
          <RNPickerSelect
            onValueChange={(value) => setSelectedSummary(value)}
            value={selectedSummary}
            placeholder={{}}
            items={[
              { label: "Today's Purchase", value: "today" },
              { label: "Monthly Purchase", value: "month" },
              { label: "Overall Summary", value: "overall" },
            ]}
            style={{
              inputIOS: styles.inputGradient,
              inputAndroid: styles.inputGradient,
              iconContainer: { top: 18, right: 15 },
            }}
            useNativeAndroidPickerStyle={false}
            Icon={() => <Ionicons name="chevron-down" size={20} color="#fff" />}
          />
        </LinearGradient>

        {/* Loading / Data */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary.main} />
          </View>
        ) : purchaseData.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="cart-outline" size={48} color={Colors.text.disabled} style={{ marginBottom: Spacing.md }} />
            <Text style={styles.emptyText}>No purchase data available.</Text>
          </View>
        ) : (
          <>
            {/* Top Summary Card */}
            <ModernCard style={styles.summaryCard} gradient padding={Spacing.xl}>
              <Text style={styles.summaryTitle}>Total Purchase</Text>
              <Text style={styles.totalValue}>â‚¹{totalPurchase.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Text>
            </ModernCard>

            {/* All Transactions */}
            <Text style={styles.sectionTitle}>All Purchases</Text>
            <FlatList
              data={purchaseData}
              keyExtractor={(item, index) => index.toString()}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: Spacing.xl + insets.bottom }}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary
  },
  content: {
    flex: 1,
    padding: Spacing.base,
  },
  pickerWrapper: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  gradientBox: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  inputGradient: {
    fontSize: Typography.fontSize.base,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: "#fff",
    fontWeight: "600",
    backgroundColor: "transparent",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Spacing['3xl'],
  },
  summaryCard: {
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  summaryTitle: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: "600",
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  totalValue: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: "bold",
    color: "#fff",
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: "800",
    marginBottom: Spacing.sm,
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 4,
  },
  transactionCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.background.primary,
    borderColor: Colors.border.light,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    backgroundColor: Colors.primary.lightest,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontWeight: "700",
    color: Colors.text.primary,
    fontSize: Typography.fontSize.base
  },
  time: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  amountContainer: {
    alignItems: 'flex-end',
    minWidth: 90,
    marginLeft: Spacing.sm,
  },
  amount: {
    color: Colors.primary.main,
    fontWeight: "700",
    fontSize: Typography.fontSize.base,
    textAlign: "right",
  },
  emptyText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.base,
  },
});

