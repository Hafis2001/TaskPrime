import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRouter } from "expo-router";
import { useEffect, useLayoutEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ModernCard from "../../components/ui/ModernCard";
import ModernHeader from "../../components/ui/ModernHeader";
import { BorderRadius, Colors, Shadows, Spacing, Typography } from "../../constants/modernTheme";

const PDC_API_URL = "https://taskprime.app/api/get-pdc/";

export default function PDCReportScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [pdcData, setPdcData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [activeTab, setActiveTab] = useState("I"); // "I" for Incoming, "O" for Outgoing
    const [searchQuery, setSearchQuery] = useState("");
    const [user, setUser] = useState(null);
    const router = useRouter();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: false,
        });
    }, [navigation]);

    const init = async () => {
        const storedUser = await AsyncStorage.getItem("user");
        if (!storedUser) {
            router.replace("/");
            return;
        }
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        fetchPDCReport(parsedUser);
    };

    useEffect(() => {
        init();
    }, []);

    const fetchPDCReport = async (parsedUser) => {
        try {
            setLoading(true);
            const response = await fetch(
                `${PDC_API_URL}?client_id=${parsedUser.clientId}`,
                {
                    headers: {
                        Accept: "application/json",
                        Authorization: `Bearer ${parsedUser.token}`,
                    },
                }
            );

            const json = await response.json();
            if (json.success && Array.isArray(json.data)) {
                setPdcData(json.data);
                applyFilters(json.data, activeTab, searchQuery);
            } else {
                setPdcData([]);
                setFilteredData([]);
            }
        } catch (error) {
            console.error("❌ PDC Fetch error:", error);
            setPdcData([]);
            setFilteredData([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const applyFilters = (data, status, search) => {
        let filtered = data.filter((item) => item.status === status);
        if (search) {
            filtered = filtered.filter((item) =>
                item.party.toLowerCase().includes(search.toLowerCase()) ||
                item.chequeno.toLowerCase().includes(search.toLowerCase())
            );
        }
        setFilteredData(filtered);
    };

    const onRefresh = () => {
        setRefreshing(true);
        if (user) fetchPDCReport(user);
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        applyFilters(pdcData, tab, searchQuery);
    };

    const handleSearch = (text) => {
        setSearchQuery(text);
        applyFilters(pdcData, activeTab, text);
    };

    const renderPDCItem = ({ item }) => (
        <ModernCard style={styles.pdcCard} elevated={true}>
            <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: item.status === 'I' ? Colors.success.lightest : Colors.primary.lightest }]}>
                    <Ionicons
                        name={item.status === 'I' ? "arrow-down-circle-outline" : "arrow-up-circle-outline"}
                        size={24}
                        color={item.status === 'I' ? Colors.success.main : Colors.primary.main}
                    />
                </View>
                <View style={styles.partyInfo}>
                    <Text style={styles.partyName}>{item.party}</Text>
                    <Text style={styles.chequeNum}>Cheque No: {item.chequeno}</Text>
                </View>
                <View style={styles.amountBox}>
                    <Text style={styles.amountLabel}>Amount</Text>
                    <Text style={styles.amountValue}>₹{parseFloat(item.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.cardContent}>
                <View style={styles.dateRow}>
                    <View style={styles.dateItem}>
                        <Ionicons name="calendar-outline" size={14} color={Colors.text.tertiary} style={{ marginRight: 4 }} />
                        <View>
                            <Text style={styles.dateLabel}>Cheque Date</Text>
                            <Text style={styles.dateValue}>{item.chequedate}</Text>
                        </View>
                    </View>
                    <View style={styles.dateItem}>
                        <Ionicons name="today-outline" size={14} color={Colors.text.tertiary} style={{ marginRight: 4 }} />
                        <View>
                            <Text style={styles.dateLabel}>Collection Date</Text>
                            <Text style={styles.dateValue}>{item.colndate}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.statusFooter}>
                    <View style={styles.badgeContainer}>
                        <View style={[styles.statusBadge, { backgroundColor: item.colnstatus === 'Y' ? Colors.success.lightest : '#fff5f5' }]}>
                            <Text style={[styles.statusBadgeText, { color: item.colnstatus === 'Y' ? Colors.success.main : '#ff4444' }]}>
                                {item.colnstatus === 'Y' ? 'Collected' : 'Pending'}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.typeLabel}>{item.status === 'I' ? 'Incoming PDC' : 'Outgoing PDC'}</Text>
                </View>
            </View>
        </ModernCard>
    );

    return (
        <View style={styles.container}>
            <ModernHeader
                title="PDC Report"
                leftIcon={<Ionicons name="menu-outline" size={26} color={Colors.primary.main} />}
                onLeftPress={() => navigation.toggleDrawer()}
            />

            <View style={styles.content}>
                {/* Modern Tab Switcher */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'I' && styles.activeTab]}
                        onPress={() => handleTabChange('I')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="download-outline" size={18} color={activeTab === 'I' ? '#fff' : Colors.text.secondary} />
                        <Text style={[styles.tabText, activeTab === 'I' && styles.activeTabText]}>Incoming</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'O' && styles.activeTab]}
                        onPress={() => handleTabChange('O')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="paper-plane-outline" size={18} color={activeTab === 'O' ? '#fff' : Colors.text.secondary} />
                        <Text style={[styles.tabText, activeTab === 'O' && styles.activeTabText]}>Outgoing</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={20} color={Colors.text.tertiary} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search party or cheque no..."
                        placeholderTextColor={Colors.text.disabled}
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                    {searchQuery !== "" && (
                        <Ionicons
                            name="close-circle"
                            size={18}
                            color={Colors.text.disabled}
                            onPress={() => handleSearch("")}
                        />
                    )}
                </View>

                {loading && !refreshing ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={Colors.primary.main} />
                        <Text style={styles.loadingText}>Fetching PDC Records...</Text>
                    </View>
                ) : filteredData.length === 0 ? (
                    <View style={styles.centered}>
                        <Ionicons name="document-text-outline" size={64} color={Colors.text.disabled} />
                        <Text style={styles.emptyText}>No {activeTab === 'I' ? 'Incoming' : 'Outgoing'} records found.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredData}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={renderPDCItem}
                        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary.main]} />
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
        backgroundColor: Colors.background.secondary,
    },
    content: {
        flex: 1,
        padding: Spacing.base,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.lg,
        padding: 4,
        marginBottom: Spacing.md,
        ...Shadows.xs,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: BorderRadius.md,
        gap: 8,
    },
    activeTab: {
        backgroundColor: Colors.primary.main,
        ...Shadows.sm,
    },
    tabText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.text.secondary,
    },
    activeTabText: {
        color: '#fff',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        marginBottom: Spacing.md,
        height: 50,
        borderWidth: 1,
        borderColor: Colors.border.light,
        ...Shadows.xs,
    },
    searchIcon: {
        marginRight: Spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: Typography.fontSize.base,
        color: Colors.text.primary,
    },
    pdcCard: {
        marginBottom: Spacing.md,
        padding: Spacing.md,
        backgroundColor: Colors.background.primary,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    partyInfo: {
        flex: 1,
    },
    partyName: {
        fontSize: Typography.fontSize.base,
        fontWeight: '800',
        color: Colors.text.primary,
    },
    chequeNum: {
        fontSize: Typography.fontSize.xs,
        color: Colors.text.secondary,
        marginTop: 2,
    },
    amountBox: {
        alignItems: 'flex-end',
    },
    amountLabel: {
        fontSize: 10,
        color: Colors.text.tertiary,
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    amountValue: {
        fontSize: Typography.fontSize.base,
        fontWeight: '800',
        color: Colors.primary.main,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.border.light,
        marginVertical: Spacing.md,
    },
    cardContent: {
        gap: Spacing.md,
    },
    dateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dateItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    dateLabel: {
        fontSize: 10,
        color: Colors.text.tertiary,
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    dateValue: {
        fontSize: Typography.fontSize.sm,
        color: Colors.text.primary,
        fontWeight: '700',
        marginTop: 2,
    },
    statusFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.background.secondary,
        padding: 8,
        borderRadius: BorderRadius.sm,
    },
    badgeContainer: {
        flexDirection: 'row',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '800',
    },
    typeLabel: {
        fontSize: 10,
        color: Colors.text.secondary,
        fontStyle: 'italic',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    loadingText: {
        marginTop: Spacing.md,
        color: Colors.text.secondary,
        fontSize: Typography.fontSize.base,
    },
    emptyText: {
        marginTop: Spacing.md,
        color: Colors.text.disabled,
        fontSize: Typography.fontSize.lg,
    },
});
