import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import ModernCard from "../../components/ui/ModernCard";
import ModernHeader from "../../components/ui/ModernHeader";
import ModernInput from "../../components/ui/ModernInput";
import { Colors, Spacing, Typography } from "../../constants/modernTheme";
import { moderateScale, moderateVerticalScale, verticalScale, isTablet } from "../../src/utils/Responsive";
import { useLicenseModules } from "../../src/utils/useLicenseModules";

const API_URL = "https://taskprime.app/api/debtors/get-debtors/";

export default function DebtorsScreen() {
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalStores, setTotalStores] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [rawJson, setRawJson] = useState(null);
  const router = useRouter();
  const { checkModule } = useLicenseModules();
  const [isLicensed, setIsLicensed] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const runCheck = async () => { setIsLicensed(null);
        const allowed = await checkModule("MOD033", "Customers", () => {
          router.push("/(drawer)/(tabs)");
        });

        if (!allowed) {
          setIsLicensed(false);
          return;
        }
        setIsLicensed(true);
        if (data.length === 0) fetchDebtors();
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
    }, [data.length])
  );

  const fetchDebtors = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        Alert.alert("Session Expired", "Please login again.");
        setLoading(false);
        return;
      }

      const response = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        console.error("Invalid JSON:", text.slice(0, 200));
        Alert.alert("Server Error", "Received invalid response from the server.");
        setLoading(false);
        return;
      }

      setRawJson(result);
      let arrayData = [];
      if (Array.isArray(result)) arrayData = result;
      else if (Array.isArray(result.data)) arrayData = result.data;
      else if (Array.isArray(result.results)) arrayData = result.results;

      const formatted = arrayData
        .map((item) => {
          let name = item.name ?? "-";
          name = name.replace(/^\(.*?\)\s*/g, "").trim();
          name = name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
          const balance = Math.round(Number(item.balance ?? 0));
          return {
            id: item.code || item.id || Math.random().toString(),
            name,
            place: item.place ?? "-",
            phone: item.phone ?? "-",
            balance,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      setData(formatted);
      setFiltered(formatted);
      setTotalStores(formatted.length);
      const totalBal = formatted.reduce((sum, c) => sum + c.balance, 0);
      setTotalBalance(totalBal);
    } catch (error) {
      console.error("ðŸ”¥ Error fetching customers:", error);
      Alert.alert("Network Error", "Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };



  useFocusEffect(
    useCallback(() => {
      setSearchQuery("");
      setFiltered(data);
    }, [data])
  );

  useEffect(() => {
    const filteredData = data.filter(
      (i) =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.place.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.phone.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFiltered(filteredData);
  }, [searchQuery, data]);

  if (isLicensed === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background.secondary }}>
        <ActivityIndicator size="large" color={Colors.primary.main} />
      </View>
    );
  }
  if (!isLicensed) return null;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary.main} />
      </View>
    );
  }

  const renderCard = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: "/customer-ledger",
          params: {
            code: item.id,
            name: item.name,
            current_balance: item.balance.toString(),
          },
        })
      }
    >
      <ModernCard style={styles.card} elevated>
        <View style={styles.cardRow}>
          <View style={styles.iconContainer}>
            <Text style={styles.avatarText}>
              {item.name ? item.name.charAt(0).toUpperCase() : "C"}
            </Text>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.cardValue} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.detailRow}>
              <Ionicons name="call-outline" size={moderateScale(12)} color={Colors.text.secondary} style={{ marginRight: moderateScale(4) }} />
              <Text style={styles.subText}>{item.phone}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={moderateScale(12)} color={Colors.text.secondary} style={{ marginRight: moderateScale(4) }} />
              <Text style={styles.subText}>{item.place}</Text>
            </View>
          </View>

          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Balance</Text>
            <Text
              style={[
                styles.balanceText,
                { color: item.balance < 0 ? Colors.error.main : Colors.success.dark },
              ]}
              numberOfLines={1}
            >
              {Math.abs(item.balance).toLocaleString("en-IN")}
            </Text>
            <Text style={[styles.drCr, { color: item.balance < 0 ? Colors.error.main : Colors.success.dark }]}>
              {/* {item.balance < 0 ? "DR" : "CR"} */}
            </Text>
          </View>
        </View>
      </ModernCard>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ModernHeader
        title="Customers Statement"
        leftIcon={<Ionicons name="arrow-back" size={moderateScale(24)} color={Colors.primary.main} />}
        onLeftPress={() => router.push("/(drawer)/(tabs)")}
      />

      <View style={styles.content}>
        <ModernCard style={styles.summaryCard} gradient>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Stores</Text>
              <Text style={styles.summaryValue}>{totalStores}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Balance</Text>
              <Text style={styles.summaryValue}>{Math.round(totalBalance).toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </ModernCard>

        <View style={styles.searchContainer}>
          <ModernInput
            placeholder="Search by Name, Place or Phone"
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={<Ionicons name="search" size={moderateScale(20)} color={Colors.text.tertiary} />}
            containerStyle={styles.searchBox}
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            searchQuery.trim() !== "" ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={moderateScale(48)} color={Colors.text.disabled} />
                <Text style={styles.emptyText}>
                  No results found for "{searchQuery}"
                </Text>
              </View>
            ) : (
              <ScrollView style={{ padding: 20 }}>
                <Text style={{ fontWeight: "bold", color: "red" }}>
                  âš ï¸ No data displayed. API Raw Output:
                </Text>
                <Text selectable style={{ fontFamily: "monospace", fontSize: 12 }}>
                  {JSON.stringify(rawJson, null, 2)}
                </Text>
              </ScrollView>
            )
          }
        />
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
    padding: moderateScale(Spacing.base),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  summaryCard: {
    marginBottom: Spacing.base,
    padding: Spacing.base,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    width: moderateScale(1),
    height: moderateVerticalScale(40),
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  summaryLabel: {
    fontSize: moderateScale(Typography.fontSize.xs),
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: moderateVerticalScale(4),
  },
  summaryValue: {
    fontSize: moderateScale(Typography.fontSize.xl),
    fontWeight: Typography.fontWeight.bold,
    color: '#FFFFFF',
  },
  searchContainer: {
    marginBottom: Spacing.xs,
  },
  searchBox: {
    marginBottom: 0,
  },
  listContent: {
    paddingBottom: Spacing['3xl'],
  },
  card: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: Colors.primary.lightest,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: moderateScale(Spacing.md),
  },
  avatarText: {
    fontSize: moderateScale(Typography.fontSize.lg),
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary.dark,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  cardValue: {
    fontSize: moderateScale(Typography.fontSize.base),
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: moderateVerticalScale(4),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: moderateVerticalScale(2),
  },
  subText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  balanceContainer: {
    alignItems: "flex-end",
    minWidth: 100,
    marginLeft: Spacing.sm,
  },
  balanceLabel: {
    fontSize: moderateScale(10),
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: moderateVerticalScale(2),
  },
  balanceText: {
    fontSize: moderateScale(Typography.fontSize.base),
    fontWeight: Typography.fontWeight.bold,
  },
  drCr: {
    fontSize: moderateScale(10),
    fontWeight: Typography.fontWeight.bold,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing['3xl'],
  },
  emptyText: {
    marginTop: Spacing.base,
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
  },
});

