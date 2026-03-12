import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ModernCard from "../../components/ui/ModernCard";
import ModernHeader from "../../components/ui/ModernHeader";
import ModernInput from "../../components/ui/ModernInput";
import { Colors, Spacing, Typography } from "../../constants/modernTheme";
import { moderateScale, moderateVerticalScale, verticalScale, isTablet } from "../../src/utils/Responsive";
import { useLicenseModules } from "../../src/utils/useLicenseModules";

const API_URL = "https://taskprime.app/api/suppiers_api/suppliers/";

export default function SuppliersScreen() {
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalSuppliers, setTotalSuppliers] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { checkModule } = useLicenseModules();
  const [isLicensed, setIsLicensed] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const runCheck = async () => { setIsLicensed(null);
        const allowed = await checkModule("MOD034", "Suppliers", () => {
          router.push("/(drawer)/(tabs)");
        });

        if (!allowed) {
          setIsLicensed(false);
          return;
        }
        setIsLicensed(true);
        if (data.length === 0) fetchSuppliers();
      };
      runCheck();

      const backAction = () => {
        router.push("/(drawer)/(tabs)");
        return true;
      };
      const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
      return () => backHandler.remove();
    }, [data.length])
  );

  const fetchSuppliers = async () => {
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
        setLoading(false);
        return;
      }

      let arrayData = [];
      if (Array.isArray(result)) arrayData = result;
      else if (Array.isArray(result.data)) arrayData = result.data;
      else if (Array.isArray(result.results)) arrayData = result.results;

      const formatted = arrayData
        .map((item, index) => {
          let name = item.name ?? "-";
          name = name.replace(/^\(.*?\)\s*/g, "").trim();
          name = name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
          const credit = Math.round(Number(item.credit ?? 0));
          const debit = Math.round(Number(item.debit ?? 0));
          const balance = credit - debit;

          return {
            id: item.code || item.id || `s-${index}`,
            name,
            place: item.place ?? "-",
            phone: item.phone2 ?? "-",
            credit,
            debit,
            balance,
          };
        })
        .filter((item, index, self) => index === self.findIndex((t) => t.id === item.id))
        .filter((item) => item.balance !== 0)
        .sort((a, b) => a.name.localeCompare(b.name));

      setData(formatted);
      setFiltered(formatted);
      setTotalSuppliers(formatted.length);
      setTotalBalance(formatted.reduce((sum, c) => sum + c.balance, 0));
    } catch (error) {
      console.error("ðŸ”¥ Error fetching suppliers:", error);
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

  const renderCard = ({ item }) => (
    <ModernCard style={styles.card} elevated>
      <View style={styles.cardRow}>
        <View style={styles.iconContainer}>
          <Text style={styles.avatarText}>
            {item.name ? item.name.charAt(0).toUpperCase() : "S"}
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
  );

  return (
    <View style={styles.container}>
      <ModernHeader
        title="Suppliers Statement"
        leftIcon={<Ionicons name="arrow-back" size={moderateScale(24)} color={Colors.primary.main} />}
        onLeftPress={() => router.push("/(drawer)/(tabs)")}
      />

      <View style={styles.content}>
        <ModernCard style={styles.summaryCard} gradient>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Suppliers</Text>
              <Text style={styles.summaryValue}>{totalSuppliers}</Text>
            </View>
            <View style={styles.totalDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Balance</Text>
              <Text style={styles.summaryValue}>
                {Math.abs(totalBalance).toLocaleString('en-IN')}
                {/* <Text style={styles.miniDrCr}>{totalBalance < 0 ? " DR" : " CR"}</Text> */}
              </Text>
            </View>
          </View>
        </ModernCard>

        <ModernInput
          placeholder="Search Name, Place or Phone"
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={<Ionicons name="search" size={moderateScale(20)} color={Colors.text.tertiary} />}
          containerStyle={styles.searchBox}
        />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary.main} />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={moderateScale(48)} color={Colors.text.disabled} />
                <Text style={styles.emptyText}>No suppliers found.</Text>
              </View>
            }
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
  totalDivider: {
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
  miniDrCr: {
    fontSize: 10,
    fontWeight: 'normal',
  },
  searchBox: {
    marginBottom: Spacing.md,
  },
  listContent: {
    paddingBottom: Spacing['3xl'],
  },
  card: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.background.primary,
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
    fontSize: moderateScale(Typography.fontSize.xs),
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
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border.light,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statValue: {
    fontSize: Typography.fontSize.sm,
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

