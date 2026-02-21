import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import { Colors, Shadows, Spacing, Typography } from "../../../constants/modernTheme";
import { Screen, moderateScale } from "../../../src/utils/Responsive";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const API_URLS = {
    DayWise: "https://taskprime.app/api/salesdaywise/",
    MonthWise: "https://taskprime.app/api/salesmonthwise/",
};

// Sub-component for individual animated bars to respect Rules of Hooks
const GraphBar = ({ height, color, label }) => {
    const animatedHeight = useMemo(() => new Animated.Value(0), []);

    useEffect(() => {
        Animated.timing(animatedHeight, {
            toValue: height,
            duration: 1000,
            useNativeDriver: false,
        }).start();
    }, [height]);

    return (
        <View style={styles.pointGroup}>
            <View style={styles.barArea}>
                <Animated.View style={[styles.animatedBar, { height: animatedHeight, backgroundColor: color + "10" }]}>
                    <View style={[styles.barTop, { backgroundColor: color }]} />
                    <LinearGradient
                        colors={[color + "40", color + "05"]}
                        style={styles.barGradient}
                    />
                </Animated.View>
            </View>
            <Text style={styles.axisLabel}>{label}</Text>
        </View>
    );
};

// Perfect Graph Component
const PerfectGraph = ({ data, color, loading }) => {
    if (loading) {
        return <ActivityIndicator size="large" color={color} style={{ height: 180 }} />;
    }
    if (!data || data.length === 0) {
        return (
            <View style={[styles.chartWrapper, styles.centered]}>
                <Ionicons name="stats-chart-outline" size={32} color={Colors.text.disabled} />
                <Text style={styles.emptyChartText}>No Data Available</Text>
            </View>
        );
    }

    const chartData = data.slice(-7);
    const maxVal = Math.max(...chartData.map(d => parseFloat(d.total_amount || 0)), 1);
    const chartHeight = 150;

    return (
        <View style={styles.chartContainer}>
            <View style={styles.pointsRow}>
                {chartData.map((item, index) => (
                    <GraphBar
                        key={index}
                        height={(parseFloat(item.total_amount || 0) / maxVal) * chartHeight}
                        color={color}
                        label={item.date ? new Date(item.date).toLocaleDateString('en', { weekday: 'short' }) : item.month_name?.substring(0, 3)}
                    />
                ))}
            </View>
        </View>
    );
};

export default function DashboardScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [salesType, setSalesType] = useState("DayWise");
    const [salesData, setSalesData] = useState([]);

    const summary = useMemo(() => {
        const total = salesData.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);
        return {
            total: total,
            trend: "+14.2%" // Dynamic trend calculation could be added if needed
        };
    }, [salesData]);

    useEffect(() => {
        const loadInitial = async () => {
            const storedUser = await AsyncStorage.getItem("user");
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                setUser(parsed);
                fetchDashboardData(parsed, salesType);
            }
        };
        loadInitial();
    }, [salesType]);

    const fetchDashboardData = async (parsedUser, type) => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URLS[type]}?client_id=${parsedUser.clientId}`, {
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${parsedUser.token}`,
                },
            });
            const json = await response.json();
            if (json.success && Array.isArray(json.data)) {
                setSalesData(json.data);
            }
        } catch (error) {
            console.error("Dashboard fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    const QuickAction = ({ title, subtitle, icon, color, route }) => (
        <TouchableOpacity
            style={styles.actionCardWrap}
            activeOpacity={0.7}
            onPress={() => router.push(route)}
        >
            <ModernCard style={styles.actionCard}>
                <View style={[styles.actionIconContainer, { backgroundColor: color + "12" }]}>
                    <Ionicons name={icon} size={28} color={color} />
                </View>
                <Text style={styles.actionTitle}>{title}</Text>
                <Text style={styles.actionSubtitle}>{subtitle}</Text>
            </ModernCard>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Custom Minimal Header */}
            <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={styles.menuIconButton}>
                        <View style={styles.headerIconBox}>
                            <Ionicons name="grid" size={20} color={Colors.primary.main} />
                        </View>
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>Overview</Text>
                        <Text style={styles.headerSubtitle}>Welcome back, {user?.name || "Admin"}</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.notifButton}>
                    <Ionicons name="notifications-outline" size={24} color={Colors.text.primary} />
                    <View style={styles.notifDot} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Main Dashboard Card */}
                <ModernCard style={styles.dashboardCard} elevated>
                    <View style={styles.cardTopRow}>
                        <TouchableOpacity
                            style={styles.typeSelector}
                            onPress={() => setSalesType(salesType === "DayWise" ? "MonthWise" : "DayWise")}
                        >
                            <Text style={styles.typeSelectorText}>
                                {salesType === "DayWise" ? "Day-wise Sales" : "Month-wise Sales"}
                            </Text>
                            <Ionicons name="chevron-down" size={16} color={Colors.text.secondary} />
                        </TouchableOpacity>
                        <View style={styles.trendRow}>
                            <Text style={styles.trendLabel}>TREND</Text>
                            <Text style={styles.trendPercent}>{summary.trend}</Text>
                        </View>
                    </View>

                    <Text style={styles.mainTotalText}>
                        ₹{summary.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </Text>

                    <PerfectGraph data={salesData} color={Colors.primary.main} loading={loading} />
                </ModernCard>

                {/* Sales Breakdown Section */}
                <Text style={styles.sectionHeader}>SALES BREAKDOWN</Text>
                <ModernCard style={styles.breakdownCard} elevated={false}>
                    {salesData.slice(0, 5).map((item, index) => (
                        <View key={index} style={[styles.breakdownItem, index === 0 && { borderTopWidth: 0 }]}>
                            <Text style={styles.breakdownLabel}>
                                {item.date ? new Date(item.date).toLocaleDateString('en-US', { weekday: 'long' }) : item.month_name}
                            </Text>
                            <Text style={styles.breakdownValue}>
                                ₹{parseFloat(item.total_amount).toLocaleString("en-IN")}
                            </Text>
                        </View>
                    ))}
                    <TouchableOpacity
                        style={styles.viewFullRow}
                        onPress={() => router.push("/(drawer)/sales-report")}
                    >
                        <Text style={styles.viewFullLink}>View Full Report</Text>
                    </TouchableOpacity>
                </ModernCard>

                {/* Quick Actions Grid */}
                <Text style={styles.sectionHeader}>QUICK ACTIONS</Text>
                <View style={styles.quickGrid}>
                    <QuickAction
                        title="Stock Report"
                        subtitle="Inventory details"
                        icon="cube-outline"
                        color="#4A90E2"
                        route="/(drawer)/stock-report"
                    />
                    <QuickAction
                        title="Event Log"
                        subtitle="Activity tracking"
                        icon="list-outline"
                        color="#A569BD"
                        route="/(drawer)/event-log"
                    />
                    <QuickAction
                        title="PDC"
                        subtitle="Pending checks"
                        icon="document-text-outline"
                        color="#52BE80"
                        route="/(drawer)/pdc-report"
                    />
                    <QuickAction
                        title="Cash & Bank"
                        subtitle="Finance summary"
                        icon="cash-outline"
                        color="#F39C12"
                        route="/(drawer)/bank-cash"
                    />
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFC",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.md,
        backgroundColor: "#ffffff",
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    menuIconButton: {
        marginRight: Spacing.md,
    },
    headerIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.primary.main + "15",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: Typography.fontSize.xl,
        fontWeight: "900",
        color: Colors.dark.main,
    },
    headerSubtitle: {
        fontSize: Typography.fontSize.xs,
        color: Colors.text.tertiary,
    },
    notifButton: {
        width: 45,
        height: 45,
        borderRadius: 12,
        backgroundColor: "#F0F4F8",
        justifyContent: "center",
        alignItems: "center",
    },
    notifDot: {
        position: "absolute",
        top: 12,
        right: 12,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.error.main,
        borderWidth: 2,
        borderColor: "#ffffff",
    },
    scrollContent: {
        padding: Spacing.xl,
    },
    dashboardCard: {
        padding: Spacing.xl,
        borderRadius: 28,
        marginBottom: Spacing.xl,
    },
    cardTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: Spacing.md,
    },
    typeSelector: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F2F5F8",
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 10,
    },
    typeSelectorText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: "700",
        color: Colors.text.secondary,
        marginRight: 4,
    },
    trendRow: {
        backgroundColor: "#FFF5EB",
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 10,
        alignItems: "center",
    },
    trendLabel: {
        fontSize: 10,
        fontWeight: "900",
        color: Colors.text.tertiary,
    },
    trendPercent: {
        fontSize: 12,
        fontWeight: "900",
        color: Colors.primary.main,
    },
    mainTotalText: {
        fontSize: moderateScale(32),
        fontWeight: "900",
        color: Colors.dark.main,
        marginBottom: Spacing.xl,
    },
    chartContainer: {
        height: 180,
        width: '100%',
        justifyContent: 'flex-end',
    },
    pointsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 160,
    },
    pointGroup: {
        alignItems: 'center',
        flex: 1,
    },
    barArea: {
        flex: 1,
        width: '100%',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    animatedBar: {
        width: Screen.isTablet ? 20 : 12,
        borderRadius: 6,
        marginBottom: 10,
        overflow: 'hidden',
    },
    barTop: {
        height: 4,
        width: '100%',
    },
    barGradient: {
        flex: 1,
        width: '100%',
    },
    axisLabel: {
        fontSize: 10,
        color: Colors.text.tertiary,
        fontWeight: "700",
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: "900",
        color: "#94A3B8",
        letterSpacing: 2,
        marginBottom: Spacing.lg,
        marginLeft: 4,
    },
    breakdownCard: {
        padding: 0,
        borderRadius: 24,
        marginBottom: Spacing.xl,
        overflow: 'hidden',
        backgroundColor: "#ffffff",
        ...Shadows.sm,
    },
    breakdownItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: Spacing.xl,
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
    },
    breakdownLabel: {
        fontSize: Typography.fontSize.base,
        color: "#475569",
        fontWeight: "600",
    },
    breakdownValue: {
        fontSize: Typography.fontSize.base,
        fontWeight: "800",
        color: Colors.primary.main,
    },
    viewFullRow: {
        padding: Spacing.lg,
        alignItems: "center",
    },
    viewFullLink: {
        fontSize: Typography.fontSize.sm,
        color: Colors.primary.main,
        fontWeight: "800",
    },
    quickGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    actionCardWrap: {
        width: Screen.isTablet ? "24%" : "48%",
        marginBottom: Spacing.md,
    },
    actionCard: {
        padding: Spacing.md,
        alignItems: "center",
        borderRadius: 24,
        height: 170,
        justifyContent: "center",
        backgroundColor: "#ffffff",
        ...Shadows.sm,
    },
    actionIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: Spacing.md,
    },
    actionTitle: {
        fontSize: Typography.fontSize.base,
        fontWeight: "800",
        color: Colors.dark.main,
        textAlign: "center",
    },
    actionSubtitle: {
        fontSize: 10,
        color: Colors.text.tertiary,
        fontWeight: "700",
        marginTop: 4,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    chartWrapper: {
        height: 180,
    },
    emptyChartText: {
        marginTop: 8,
        color: Colors.text.disabled,
        fontWeight: '700',
    },
});
