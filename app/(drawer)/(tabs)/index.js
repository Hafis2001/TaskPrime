import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ModernCard from "../../../components/ui/ModernCard";
import { Colors, Shadows } from "../../../constants/modernTheme";
import { Screen } from "../../../src/utils/Responsive";
import { useLicenseModules } from "../../../src/utils/useLicenseModules";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const API_URLS = {
    DayWise: "https://taskprime.app/api/salesdaywise/",
    MonthWise: "https://taskprime.app/api/salesmonthwise/",
};
const TODAY_API = "https://taskprime.app/api/salestoday-details/";

// ── Animated bar (compact height) ────────────────────────────────────────────
const GraphBar = ({ height, color, label }) => {
    const animatedHeight = useMemo(() => new Animated.Value(0), []);
    useEffect(() => {
        Animated.timing(animatedHeight, {
            toValue: height,
            duration: 900,
            useNativeDriver: false,
        }).start();
    }, [height]);

    return (
        <View style={styles.pointGroup}>
            <View style={styles.barArea}>
                <Animated.View style={[styles.animatedBar, { height: animatedHeight, backgroundColor: color + "10" }]}>
                    <View style={[styles.barTop, { backgroundColor: color }]} />
                    <LinearGradient colors={[color + "50", color + "05"]} style={styles.barGradient} />
                </Animated.View>
            </View>
            <Text style={styles.axisLabel}>{label}</Text>
        </View>
    );
};

// ── Compact chart ─────────────────────────────────────────────────────────────
const PerfectGraph = ({ data, color, loading, salesType }) => {
    if (loading) return <ActivityIndicator size="small" color={color} style={{ height: 100 }} />;
    if (!data || data.length === 0) {
        return (
            <View style={[styles.chartContainer, styles.centered]}>
                <Ionicons name="stats-chart-outline" size={26} color={Colors.text.disabled} />
                <Text style={styles.emptyChartText}>No Data</Text>
            </View>
        );
    }
    const isDayWise = salesType === "DayWise";
    // For day-wise, data often comes newest-first. Reverse so newest is on the right.
    const sortedData = isDayWise ? [...data].reverse() : data;
    const chartData = sortedData.slice(-10);
    const getValue = (d) => parseFloat(d.total_amount || 0);
    const maxVal = Math.max(...chartData.map(getValue), 1);
    const chartHeight = 100;

    return (
        <View style={styles.chartContainer}>
            <View style={styles.pointsRow}>
                {chartData.map((item, index) => (
                    <GraphBar
                        key={index}
                        height={(getValue(item) / maxVal) * chartHeight}
                        color={color}
                        label={
                            isDayWise
                                ? `${item.total_bills}`
                                : item.month_name?.substring(0, 3)
                        }
                    />
                ))}
            </View>
        </View>
    );
};

// ── Main screen ───────────────────────────────────────────────────────────────
export default function DashboardScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const [user, setUser] = useState(null);
    const { checkModule, hasModule } = useLicenseModules();

    // Graph state — switches between DayWise and MonthWise
    const [loading, setLoading] = useState(true);
    const [salesType, setSalesType] = useState("DayWise");
    const [salesData, setSalesData] = useState([]);

    // Breakdown state — synced with graph toggle
    const [breakdownLoading, setBreakdownLoading] = useState(true);
    const [breakdownData, setBreakdownData] = useState([]);

    // Today's grand total
    const [todayTotal, setTodayTotal] = useState(null);
    const [todayBills, setTodayBills] = useState(null);
    const [todayLoading, setTodayLoading] = useState(true);

    const summary = useMemo(() => {
        const isDayWise = salesType === "DayWise";
        const monthTotal = !isDayWise
            ? salesData.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0)
            : null;
        return { monthTotal };
    }, [salesData, salesType]);

    const fetchGraphData = async (parsedUser, type) => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URLS[type]}?client_id=${parsedUser.clientId}`, {
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${parsedUser.token}`,
                },
            });
            if (!response.ok) { console.warn("Graph API error:", response.status); setSalesData([]); return; }
            const text = await response.text();
            if (!text.startsWith("{") && !text.startsWith("[")) { setSalesData([]); return; }
            const json = JSON.parse(text);
            if (json.success && Array.isArray(json.data)) setSalesData(json.data);
            else setSalesData([]);
        } catch (error) {
            console.error("Graph fetch error:", error);
            setSalesData([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchTodayData = async (parsedUser) => {
        try {
            setTodayLoading(true);
            const response = await fetch(`${TODAY_API}?client_id=${parsedUser.clientId}`, {
                headers: { Accept: "application/json", Authorization: `Bearer ${parsedUser.token}` },
            });
            if (!response.ok) { console.warn("Today API error:", response.status); return; }
            const text = await response.text();
            if (!text.startsWith("{") && !text.startsWith("[")) { return; }
            const json = JSON.parse(text);
            if (json.success) {
                setTodayTotal(json.grand_total ?? null);
                if (Array.isArray(json.data)) {
                    setTodayBills(json.data.length);
                }
            }
        } catch (error) {
            console.error("Today fetch error:", error);
        } finally {
            setTodayLoading(false);
        }
    };

    const fetchBreakdownData = async (parsedUser, type = "DayWise") => {
        try {
            setBreakdownLoading(true);
            const url = type === "MonthWise"
                ? `https://taskprime.app/api/salesmonthwise/?client_id=${parsedUser.clientId}`
                : `https://taskprime.app/api/salesdaywise/?client_id=${parsedUser.clientId}`;
            const response = await fetch(url, {
                headers: { Accept: "application/json", Authorization: `Bearer ${parsedUser.token}` },
            });
            if (!response.ok) { console.warn("Breakdown API error:", response.status); setBreakdownData([]); return; }
            const text = await response.text();
            if (!text.startsWith("{") && !text.startsWith("[")) { setBreakdownData([]); return; }
            const json = JSON.parse(text);
            if (json.success && Array.isArray(json.data)) setBreakdownData(json.data);
            else setBreakdownData([]);
        } catch (error) {
            console.error("Breakdown fetch error:", error);
            setBreakdownData([]);
        } finally {
            setBreakdownLoading(false);
        }
    };

    // On focus: load user, fetch today total and initial breakdown
    useFocusEffect(
        useCallback(() => {
            const loadInitial = async () => {
                const storedUser = await AsyncStorage.getItem("user");
                if (storedUser) {
                    const parsed = JSON.parse(storedUser);
                    setUser(parsed);
                    fetchTodayData(parsed);
                    fetchBreakdownData(parsed, "DayWise");
                }
            };
            loadInitial();
        }, [])
    );

    // Whenever user loads or toggle changes, fetch graph data + breakdown
    useEffect(() => {
        if (user) {
            fetchGraphData(user, salesType);
            fetchBreakdownData(user, salesType);
        }
    }, [user, salesType]);

    const breakdownItems = breakdownData;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* ── Header ── */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={styles.menuBtn}>
                        <Ionicons name="grid" size={18} color={Colors.primary.main} />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>Overview</Text>
                        <Text style={styles.headerSubtitle}>Welcome, {user?.name || "Admin"}</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.notifBtn}>
                    <Ionicons name="notifications-outline" size={20} color={Colors.text.primary} />
                    <View style={styles.notifDot} />
                </TouchableOpacity>
            </View>

            {/* ── Flex body: fills ALL remaining space ── */}
            <View style={[styles.body, { paddingBottom: insets.bottom + 8 }]}>

                {/* ── Sales card + chart: biggest section ── */}
                <ModernCard style={styles.salesCard} elevated>
                    <View style={styles.salesTop}>
                        <View>
                            <Text style={styles.salesLabel}>
                                {salesType === "DayWise" ? "Day-wise Sales" : "Month-wise Sales"}
                            </Text>
                            {(salesType === "DayWise" ? todayLoading : loading)
                                ? <ActivityIndicator size="small" color={Colors.primary.main} style={{ marginTop: 4 }} />
                                : <>
                                    <Text style={styles.salesTotal}>
                                        {salesType === "MonthWise"
                                            ? Math.floor(summary.monthTotal ?? 0).toFixed(3)
                                            : Math.floor(todayTotal ?? 0).toFixed(3)
                                        }
                                    </Text>
                                    {salesType === "DayWise" && todayBills !== null && (
                                        <Text style={styles.salesCount}>{todayBills} Bills</Text>
                                    )}
                                </>
                            }
                        </View>
                        <TouchableOpacity
                            style={styles.toggleBtn}
                            onPress={() => setSalesType(salesType === "DayWise" ? "MonthWise" : "DayWise")}
                        >
                            <Ionicons name="swap-horizontal" size={14} color={Colors.primary.main} />
                            <Text style={styles.toggleText}>
                                {salesType === "DayWise" ? "Monthly" : "Daily"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Chart fills remaining card height */}
                    <View style={styles.chartFlex}>
                        <PerfectGraph data={salesData} color={Colors.primary.main} loading={loading} salesType={salesType} />
                    </View>
                </ModernCard>

                {/* ── Sales Breakdown: grows to fill whatever is left ── */}
                <View style={styles.sectionRow}>
                    <Text style={styles.sectionHeader}>SALES BREAKDOWN</Text>
                    <TouchableOpacity onPress={async () => { if (await checkModule("MOD017", "Sales Report")) router.push("/(drawer)/sales-report"); }}>
                        <Text style={styles.seeAll}>See all →</Text>
                    </TouchableOpacity>
                </View>

                <ModernCard style={styles.breakdownCard} elevated={false}>
                    <ScrollView style={{ maxHeight: 310 }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
                        {breakdownItems.length === 0 && !loading ? (
                            <Text style={styles.emptyBreakdown}>No data available</Text>
                        ) : (
                            breakdownItems.map((item, index) => (
                                <View
                                    key={index}
                                    style={[styles.breakdownRow, index > 0 && styles.breakdownBorder]}
                                >
                                    <View style={styles.breakdownDot} />
                                    <Text style={styles.breakdownLabel} numberOfLines={1}>
                                        {item.date
                                            ? new Date(item.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
                                            : item.month_name}
                                    </Text>
                                    <Text style={styles.breakdownValue}>
                                        {Math.floor(parseFloat(item.total_amount || 0)).toFixed(3)}
                                    </Text>
                                </View>
                            ))
                        )}
                    </ScrollView>
                </ModernCard>
            </View>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F1F5F9",
    },

    // Header
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: "#ffffff",
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    menuBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: Colors.primary.main + "15",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: "900",
        color: Colors.dark.main,
        lineHeight: 20,
    },
    headerSubtitle: {
        fontSize: 11,
        color: Colors.text.tertiary,
        lineHeight: 14,
    },
    notifBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "#F0F4F8",
        justifyContent: "center",
        alignItems: "center",
    },
    notifDot: {
        position: "absolute",
        top: 8,
        right: 8,
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: Colors.error.main,
        borderWidth: 1.5,
        borderColor: "#fff",
    },

    // Flex body — replaces ScrollView
    body: {
        flex: 1,
        padding: 12,
        gap: 10,
    },

    // Sales card — grows to fill available vertical space
    salesCard: {
        height: 260,
        padding: 15,
        borderRadius: 20,
    },

    // Chart stretches inside the card
    chartFlex: {
        flex: 1,
    },
    salesTop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 6,
    },
    salesLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.text.secondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    salesTotal: {
        fontSize: 30,
        fontWeight: "900",
        color: Colors.dark.main,
        marginTop: 2,
    },
    salesCount: {
        fontSize: 11,
        fontWeight: "600",
        color: Colors.text.secondary,
        marginTop: 1,
    },
    toggleBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: Colors.primary.main + "12",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    toggleText: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.primary.main,
    },

    // Chart — height is driven by flex parent now
    chartContainer: {
        flex: 1,
        width: "100%",
        justifyContent: "flex-end",
        // height:50,
    },
    pointsRow: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
    },
    pointGroup: {
        alignItems: "center",
        flex: 1,
    },
    barArea: {
        flex: 1,
        width: "100%",
        justifyContent: "flex-end",
        alignItems: "center",
    },
    animatedBar: {
        width: Screen.isTablet ? 18 : 10,
        borderRadius: 5,
        marginBottom: 6,
        overflow: "hidden",
    },
    barTop: {
        height: 3,
        width: "100%",
    },
    barGradient: {
        flex: 1,
        width: "100%",
    },
    axisLabel: {
        fontSize: 9,
        color: Colors.text.tertiary,
        fontWeight: "700",
    },
    centered: {
        justifyContent: "center",
        alignItems: "center",
    },
    emptyChartText: {
        marginTop: 4,
        color: Colors.text.disabled,
        fontSize: 11,
        fontWeight: "700",
    },

    // Quick actions
    quickRow: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 10,
        justifyContent: "space-around",
        ...Shadows.sm,
    },
    quickItem: {
        alignItems: "center",
        gap: 5,
    },
    quickIcon: {
        width: 56,
        height: 56,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
    },
    quickLabel: {
        fontSize: 12,
        fontWeight: "700",
        color: Colors.text.secondary,
    },

    // Section header
    sectionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 2,
    },
    sectionHeader: {
        fontSize: 10,
        fontWeight: "900",
        color: "#94A3B8",
        letterSpacing: 1.5,
    },
    seeAll: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.primary.main,
    },

    // Breakdown card — grows to fill leftover space
    breakdownCard: {
        height: 300,
        padding: 0,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: "#ffffff",
        ...Shadows.sm,
    },
    breakdownRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 14,
        gap: 10,
    },
    breakdownBorder: {
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
    },
    breakdownDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: Colors.primary.main + "80",
    },
    breakdownLabel: {
        flex: 1,
        fontSize: 14,
        color: "#475569",
        fontWeight: "600",
    },
    breakdownValue: {
        fontSize: 13,
        fontWeight: "800",
        color: Colors.primary.main,
    },
    breakdownSub: {
        fontSize: 11,
        fontWeight: "600",
        color: Colors.text.tertiary,
        marginHorizontal: 4,
    },
    emptyBreakdown: {
        textAlign: "center",
        padding: 16,
        color: Colors.text.disabled,
        fontSize: 13,
    },
});
