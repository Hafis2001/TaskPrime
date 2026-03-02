import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ModernCard from "../../components/ui/ModernCard";
import ModernHeader from "../../components/ui/ModernHeader";
import { Colors, Spacing, Typography } from "../../constants/modernTheme";

const BASE_API_URL = "https://taskprime.app/api/sales-return/get-data/";

export default function SalesReturnScreen() {
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    getClientIdAndFetch();

    const backAction = () => {
      router.replace("/(drawer)/(tabs)");
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );
    return () => backHandler.remove();
  }, []);

  const getClientIdAndFetch = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      if (!storedUser) {
        router.replace("/");
        return;
      }

      const parsedUser = JSON.parse(storedUser);
      let storedClientId = parsedUser?.clientId;

      if (!storedClientId) {
        Alert.alert("Error", "Account configuration missing. Please log in again.");
        setLoading(false);
        return;
      }

      // Consistent ID cleaning (O -> 0)
      const cleanClientId = storedClientId.trim().replace(/O/g, "0");
      const token = parsedUser.token;

      fetchSalesReturnData(cleanClientId, token);
    } catch (error) {
      console.error("Error initializing screen:", error);
      setLoading(false);
    }
  };

  const fetchSalesReturnData = async (storedClientId, token) => {
    try {
      setLoading(true);
      const url = `${BASE_API_URL}?client_id=${storedClientId}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      const result = await response.json();

      if (result && result.success) {
        const data = Array.isArray(result.data) ? result.data : [];
        setSalesData(data);
        const total = data.reduce((sum, item) => sum + (parseFloat(item.net) || 0), 0);
        setTotalAmount(total);
      } else {
        setSalesData([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setSalesData([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderItem = ({ item }) => (
    <ModernCard style={styles.transactionCard} elevated={false}>
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <View style={styles.iconCircle}>
            <Ionicons name="return-down-back-outline" size={20} color={Colors.error.main} />
          </View>
          <View style={styles.nameContainer}>
            <Text style={styles.name} numberOfLines={1}>{item.customername}</Text>
            <Text style={styles.time}>
              {formatDate(item.date)} • #{item.invno}
            </Text>
          </View>
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.amount} numberOfLines={1}>
            ₹{parseFloat(item.net).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </Text>
        </View>
      </View>
    </ModernCard>
  );

  return (
    <View style={styles.container}>
      <ModernHeader
        title="Sales Return"
        leftIcon={<Ionicons name="arrow-back" size={26} color={Colors.primary.main} />}
        onLeftPress={() => router.replace("/(drawer)/(tabs)")}
      />

      <View style={styles.content}>
        <ModernCard style={styles.summaryCard} gradient padding={Spacing.xl}>
          <Text style={styles.summaryTitle}>Total Returns</Text>
          <Text style={styles.totalValue}>₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{salesData.length} Invoices</Text>
          </View>
        </ModernCard>

        <Text style={styles.sectionTitle}>Recent Returns</Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary.main} />
          </View>
        ) : salesData.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="return-down-back" size={48} color={Colors.text.disabled} />
            <Text style={styles.emptyText}>No sales return data found.</Text>
          </View>
        ) : (
          <FlatList
            data={salesData}
            renderItem={renderItem}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
            showsVerticalScrollIndicator={false}
          />
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
    marginTop: Spacing.xs
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: Spacing.sm,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
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
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md
  },
  iconCircle: {
    width: 40,
    height: 40,
    backgroundColor: Colors.error.lightest,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
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
    color: Colors.error.main,
    fontWeight: "700",
    fontSize: Typography.fontSize.base,
    textAlign: "right",
  },
  emptyText: {
    marginTop: Spacing.base,
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.base,
  },
});
