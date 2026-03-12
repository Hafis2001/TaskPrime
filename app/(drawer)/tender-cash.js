import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    BackHandler,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ModernHeader from "../../components/ui/ModernHeader";
import { BorderRadius, Colors, Shadows, Spacing, Typography } from "../../constants/modernTheme";
import { useLicenseModules } from "../../src/utils/useLicenseModules";

const BY_USER_API = "https://taskprime.app/api/tender-cash-by-user/";
const BY_TYPE_API = "https://taskprime.app/api/tender-cash-bytype/";

// â”€â”€â”€ Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const fmt = (val) =>
    parseFloat(val || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

// â”€â”€â”€ Code colour map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CODE_COLORS = {
    CC: { bg: "#EEF2FF", text: "#4F46E5", dot: "#6366F1" },
    S: { bg: "#F0FDF4", text: "#16A34A", dot: "#22C55E" },
    C: { bg: "#FFF7ED", text: "#EA580C", dot: "#F97316" },
    CH: { bg: "#FDF4FF", text: "#9333EA", dot: "#A855F7" },
};
const fallbackColor = { bg: "#F8FAFC", text: "#64748B", dot: "#94A3B8" };
const getCodeColor = (code) => CODE_COLORS[code] || fallbackColor;

export default function TenderCashScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { checkModule } = useLicenseModules();

    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState("user"); // "user" | "type"

    const [isLicensed, setIsLicensed] = useState(null);

    // Cash By User state
    const [userLoading, setUserLoading] = useState(true);
    const [userError, setUserError] = useState(null);
    const [userTotal, setUserTotal] = useState(0);
    const [userData, setUserData] = useState([]);

    // Cash By Type state
    const [typeLoading, setTypeLoading] = useState(true);
    const [typeError, setTypeError] = useState(null);
    const [typeData, setTypeData] = useState([]);

    // â”€â”€ Init â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    useFocusEffect(
        useCallback(() => {
            const runCheck = async () => {
                setIsLicensed(null);
                const allowed = await checkModule("MOD036", "Tender Cash", () => {
                    router.push("/(drawer)/(tabs)");
                });

                if (!allowed) {
                    setIsLicensed(false);
                    return;
                }
                setIsLicensed(true);

                try {
                    const raw = await AsyncStorage.getItem("user");
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        setUser(parsed);
                        fetchByUser(parsed);
                        fetchByType(parsed);
                    }
                } catch (e) {
                    console.error(e);
                }
            };
            runCheck();

            const backAction = () => { router.push("/(drawer)/(tabs)"); return true; };
            const sub = BackHandler.addEventListener("hardwareBackPress", backAction);
            return () => sub.remove();
        }, [])
    );

    // â”€â”€ Fetchers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const fetchByUser = async (u) => {
        setUserLoading(true);
        setUserError(null);
        try {
            const res = await fetch(`${BY_USER_API}?client_id=${u.clientId}`, {
                headers: { Accept: "application/json", Authorization: `Bearer ${u.token}` },
            });
            const json = await res.json();
            if (json.success && (json.users || json.data)) {
                setUserTotal(json.grand_total !== undefined ? json.grand_total : (json.data?.grand_total || 0));
                setUserData(json.users || json.data?.items || json.data || []);
            } else {
                setUserError("No data returned.");
            }
        } catch (e) {
            setUserError("Failed to load. Check your connection.");
        } finally {
            setUserLoading(false);
        }
    };

    const fetchByType = async (u) => {
        setTypeLoading(true);
        setTypeError(null);
        try {
            const res = await fetch(`${BY_TYPE_API}?client_id=${u.clientId}`, {
                headers: { Accept: "application/json", Authorization: `Bearer ${u.token}` },
            });
            const json = await res.json();
            if (json.success) {
                const dataArray = Array.isArray(json.data) ? json.data : [];
                setTypeData(dataArray);
            } else {
                setTypeError("No data returned.");
            }
        } catch (e) {
            setTypeError("Failed to load. Check your connection.");
        } finally {
            setTypeLoading(false);
        }
    };

    const onRefresh = () => {
        if (user) {
            if (activeTab === "user") fetchByUser(user);
            else fetchByType(user);
        }
    };

    // â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const Tab = ({ id, label, icon }) => (
        <TouchableOpacity
            style={[styles.tab, activeTab === id && styles.tabActive]}
            onPress={() => setActiveTab(id)}
            activeOpacity={0.8}
        >
            <Ionicons
                name={icon}
                size={16}
                color={activeTab === id ? "#fff" : Colors.text.secondary}
                style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, activeTab === id && styles.tabTextActive]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    const CodeChip = ({ code, amount }) => {
        const c = getCodeColor(code);
        return (
            <View style={[styles.chip, { backgroundColor: c.bg }]}>
                <View style={[styles.chipDot, { backgroundColor: c.dot }]} />
                <Text style={[styles.chipCode, { color: c.text }]}>{code}</Text>
                <Text style={[styles.chipAmt, { color: c.text }]}>{fmt(amount)}</Text>
            </View>
        );
    };

    // â”€â”€ By User content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const ByUserContent = () => {
        if (userLoading) return <LoadingView />;
        if (userError) return <ErrorView msg={userError} onRetry={() => fetchByUser(user)} />;

        return (
            <View>
                {/* Total banner */}
                <LinearGradient
                    colors={["#4F46E5", "#7C3AED"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.totalBanner}
                >
                    <View style={styles.totalBannerInner}>
                        <View style={styles.totalIconWrap}>
                            <Ionicons name="person-circle-outline" size={32} color="#fff" />
                        </View>
                        <View>
                            <Text style={styles.totalLabel}>Total by User</Text>
                            <Text style={styles.totalValue}>{fmt(userTotal)}</Text>
                        </View>
                    </View>
                    <View style={styles.bannerDecor} />
                </LinearGradient>

                {/* Each user group */}
                {userData.map((group, gi) => (
                    <View key={gi} style={styles.sectionCard}>
                        {/* Group header */}
                        <View style={styles.groupHeader}>
                            <View style={[styles.groupBadge, { backgroundColor: '#EEF2FF' }]}>
                                <Text style={[styles.groupBadgeText, { color: '#4F46E5', textTransform: 'uppercase' }]}>{group.userid || group.user_id || "User"}</Text>
                            </View>
                            <Text style={[styles.groupTotal, { color: '#4F46E5' }]}>{fmt(group.total)}</Text>
                        </View>

                        {/* Table */}
                        <View style={styles.tableHeader}>
                            <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 2 }]}>Code / Name</Text>
                            <Text style={[styles.tableCell, styles.tableHeaderText, { textAlign: "right", flex: 1 }]}>Amount</Text>
                        </View>
                        {(group.tenders || group.items || []).map((item, i) => {
                            const c = getCodeColor(item.code);
                            const amt = item.amount !== undefined ? item.amount : item.total_amount;
                            return (
                                <View
                                    key={i}
                                    style={[
                                        styles.tableRow,
                                        { backgroundColor: i % 2 === 0 ? "#FAFBFF" : "#fff" },
                                    ]}
                                >
                                    <View style={{ flex: 2 }}>
                                        <View style={styles.codeCell}>
                                            <View style={[styles.codeBadge, { backgroundColor: c.bg }]}>
                                                <Text style={[styles.codeBadgeText, { color: c.text }]}>
                                                    {item.code}
                                                </Text>
                                            </View>
                                            <Text style={styles.userText}>
                                                {item.currency_name || ""}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={{ flex: 1, alignItems: "flex-end" }}>
                                        <Text style={[styles.amountText, { color: "#4F46E5" }]}>
                                            {fmt(amt)}
                                        </Text>
                                        <Text style={styles.percentText}>
                                            {group.total ? ((amt / group.total) * 100).toFixed(1) : 0}%
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}

                        <View style={styles.tableTotalRow}>
                            <Text style={styles.tableTotalLabel}>User Total</Text>
                            <Text style={[styles.tableTotalValue, { color: "#4F46E5" }]}>
                                {fmt(group.total)}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    // â”€â”€ By Type content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const ByTypeContent = () => {
        if (typeLoading) return <LoadingView />;
        if (typeError) return <ErrorView msg={typeError} onRetry={() => fetchByType(user)} />;

        const grandTotal = typeData.reduce((s, g) => s + (g.total || 0), 0);

        return (
            <View>
                {/* Grand total banner */}
                <LinearGradient
                    colors={["#059669", "#0D9488"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.totalBanner}
                >
                    <View style={styles.totalBannerInner}>
                        <View style={styles.totalIconWrap}>
                            <Ionicons name="layers-outline" size={32} color="#fff" />
                        </View>
                        <View>
                            <Text style={styles.totalLabel}>Total by Type</Text>
                            <Text style={styles.totalValue}>{fmt(grandTotal)}</Text>
                        </View>
                    </View>
                    <View style={styles.bannerDecor} />
                </LinearGradient>

                {/* Each type group */}
                {typeData.map((group, gi) => (
                    <View key={gi} style={styles.sectionCard}>
                        {/* Group header */}
                        <View style={styles.groupHeader}>
                            <View style={[styles.groupBadge, { backgroundColor: '#F0FDF4' }]}>
                                <Text style={[styles.groupBadgeText, { color: '#059669', textTransform: 'uppercase' }]}>{group.type_name || group.type}</Text>
                            </View>
                            <Text style={[styles.groupTotal, { color: '#059669' }]}>{fmt(group.total)}</Text>
                        </View>

                        {/* Table */}
                        <View style={styles.tableHeader}>
                            <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 2 }]}>Code / Name</Text>
                            <Text style={[styles.tableCell, styles.tableHeaderText, { textAlign: "right", flex: 1 }]}>Amount</Text>
                        </View>
                        {(group.split || group.items || group.tenders || []).map((item, i) => {
                            const c = getCodeColor(item.code);
                            const amt = item.amount !== undefined ? item.amount : item.total_amount;
                            return (
                                <View
                                    key={i}
                                    style={[
                                        styles.tableRow,
                                        { backgroundColor: i % 2 === 0 ? "#F0FDF4" : "#fff" },
                                    ]}
                                >
                                    <View style={{ flex: 2 }}>
                                        <View style={styles.codeCell}>
                                            <View style={[styles.codeBadge, { backgroundColor: c.bg }]}>
                                                <Text style={[styles.codeBadgeText, { color: c.text }]}>
                                                    {item.code}
                                                </Text>
                                            </View>
                                            <Text style={styles.userText}>
                                                {item.currency_name || ""}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={{ flex: 1, alignItems: "flex-end" }}>
                                        <Text style={[styles.amountText, { color: "#059669" }]}>
                                            {fmt(amt)}
                                        </Text>
                                        <Text style={styles.percentText}>
                                            {group.total ? ((amt / group.total) * 100).toFixed(1) : 0}%
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}

                        <View style={styles.tableTotalRow}>
                            <Text style={styles.tableTotalLabel}>Group Total</Text>
                            <Text style={[styles.tableTotalValue, { color: "#059669" }]}>
                                {fmt(group.total)}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    // â”€â”€ Shared states â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const LoadingView = () => (
        <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary.main} />
            <Text style={styles.loadingText}>Fetching dataâ€¦</Text>
        </View>
    );

    const ErrorView = ({ msg, onRetry }) => (
        <View style={styles.centered}>
            <Ionicons name="cloud-offline-outline" size={56} color={Colors.text.disabled} />
            <Text style={styles.errorText}>{msg}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.8}>
                <Ionicons name="refresh" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
        </View>
    );

    if (isLicensed === null) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background.secondary }}>
                <ActivityIndicator size="large" color={Colors.primary.main} />
            </View>
        );
    }
    if (!isLicensed) return null;

    return (
        <View style={styles.container}>
            <ModernHeader
                title="Tender Cash"
                leftIcon={<Ionicons name="arrow-back" size={24} color={Colors.primary.main} />}
                onLeftPress={() => router.push("/(drawer)/(tabs)")}
            />

            {/* Tab Bar */}
            <View style={styles.tabBar}>
                <Tab id="user" label="Tender By User" icon="person-outline" />
                <Tab id="type" label="Tender By Counter" icon="layers-outline" />
            </View>

            <ScrollView
                contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
                showsVerticalScrollIndicator={false}
            >
                {activeTab === "user" ? <ByUserContent /> : <ByTypeContent />}
            </ScrollView>
        </View>
    );
}

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F1F5F9",
    },

    // Tabs
    tabBar: {
        flexDirection: "row",
        margin: Spacing.md,
        backgroundColor: "#fff",
        borderRadius: BorderRadius.xl,
        padding: 4,
        ...Shadows.sm,
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        borderRadius: BorderRadius.lg,
    },
    tabActive: {
        backgroundColor: Colors.primary.main,
        ...Shadows.md,
    },
    tabText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: "600",
        color: Colors.text.secondary,
    },
    tabTextActive: {
        color: "#fff",
    },

    // Scroll
    scroll: {
        paddingHorizontal: Spacing.md,
        paddingTop: 4,
    },

    // Total banner
    totalBanner: {
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        marginBottom: Spacing.md,
        overflow: "hidden",
        ...Shadows.lg,
    },
    totalBannerInner: {
        flexDirection: "row",
        alignItems: "center",
    },
    totalIconWrap: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: Spacing.lg,
    },
    totalLabel: {
        color: "rgba(255,255,255,0.85)",
        fontSize: Typography.fontSize.sm,
        fontWeight: "600",
        marginBottom: 4,
    },
    totalValue: {
        color: "#fff",
        fontSize: 28,
        fontWeight: "800",
        letterSpacing: -0.5,
    },
    bannerDecor: {
        position: "absolute",
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: "rgba(255,255,255,0.08)",
        right: -30,
        top: -40,
    },

    // Section card
    sectionCard: {
        backgroundColor: "#fff",
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        ...Shadows.sm,
    },
    sectionCardTitle: {
        fontSize: Typography.fontSize.base,
        fontWeight: "700",
        color: Colors.text.primary,
        marginBottom: Spacing.md,
    },

    // Chips
    chipsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: Spacing.lg,
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    chipDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    chipCode: {
        fontSize: Typography.fontSize.sm,
        fontWeight: "700",
    },
    chipAmt: {
        fontSize: Typography.fontSize.sm,
        fontWeight: "600",
    },

    // Table
    tableHeader: {
        flexDirection: "row",
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: "#F8FAFC",
        borderRadius: BorderRadius.sm,
        marginBottom: 4,
    },
    tableCell: {
        fontSize: Typography.fontSize.xs,
    },
    tableHeaderText: {
        fontWeight: "700",
        color: Colors.text.secondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: BorderRadius.sm,
        marginBottom: 2,
    },
    codeCell: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    codeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    codeBadgeText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: "700",
    },
    userText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.text.secondary,
    },
    amountText: {
        fontSize: Typography.fontSize.base,
        fontWeight: "700",
        color: Colors.text.primary,
    },
    percentText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.text.tertiary,
        marginTop: 2,
    },
    tableTotalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: "#EEF2FF",
        marginTop: 8,
        paddingTop: 12,
    },
    tableTotalLabel: {
        fontSize: Typography.fontSize.sm,
        fontWeight: "700",
        color: Colors.text.secondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    tableTotalValue: {
        fontSize: Typography.fontSize.lg,
        fontWeight: "800",
        color: Colors.primary.main,
    },

    // Group header (by type)
    groupHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: Spacing.md,
    },
    groupBadge: {
        backgroundColor: "#ECFDF5",
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
    },
    groupBadgeText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: "700",
        color: "#059669",
    },
    groupTotal: {
        fontSize: Typography.fontSize.lg,
        fontWeight: "800",
        color: "#059669",
    },

    // States
    centered: {
        alignItems: "center",
        paddingVertical: 60,
    },
    loadingText: {
        marginTop: Spacing.md,
        color: Colors.text.secondary,
        fontSize: Typography.fontSize.base,
    },
    errorText: {
        marginTop: Spacing.md,
        color: Colors.text.secondary,
        fontSize: Typography.fontSize.base,
        textAlign: "center",
        marginBottom: Spacing.lg,
    },
    retryBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.primary.main,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: BorderRadius.md,
    },
    retryText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: Typography.fontSize.sm,
    },
});

