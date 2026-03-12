import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useState } from "react";
import {
    ActivityIndicator,
    BackHandler,
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
import { moderateScale, moderateVerticalScale, verticalScale, isTablet, Screen } from "../../src/utils/Responsive";
import { useLicenseModules } from "../../src/utils/useLicenseModules";

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
    const { checkModule } = useLicenseModules();
    const [isLicensed, setIsLicensed] = useState(null);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: false,
        });
    }, [navigation]);

    useFocusEffect(
        useCallback(() => {
            const runCheck = async () => {
                setIsLicensed(null);
                const allowed = await checkModule("MOD032", "PDC", () => {
                    router.push("/(drawer)/(tabs)");
                });

                if (!allowed) {
                    setIsLicensed(false);
                    return;
                }
                setIsLicensed(true);
                init();
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

    const init = async () => {
        if (!(await checkModule("MOD032", "PDC"))) {
            router.push("/(drawer)/(tabs)");
            return;
        }
        const storedUser = await AsyncStorage.getItem("user");
        if (!storedUser) {
            router.replace("/");
            return;
        }
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        fetchPDCReport(parsedUser);
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
            console.error("âŒ PDC Fetch error:", error);
            setPdcData([]);
            setFilteredData([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
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

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        const parts = dateStr.split("-");
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dateStr;
    };

    const renderPDCItem = ({ item }) => (
        <ModernCard style={styles.pdcCard} elevated={true}>
            <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { width: moderateScale(48), height: moderateScale(48), borderRadius: moderateScale(24), backgroundColor: item.status === 'I' ? Colors.success.lightest : Colors.primary.lightest }]}>
                    <Ionicons
                        name={item.status === 'I' ? "arrow-down-circle-outline" : "arrow-up-circle-outline"}
                        size={moderateScale(24)}
                        color={item.status === 'I' ? Colors.success.main : Colors.primary.main}
                    />
                </View>
                <View style={styles.partyInfo}>
                    <Text style={styles.partyName}>{item.party}</Text>
                    <Text style={styles.chequeNum}>Cheque No: {item.chequeno}</Text>
                </View>
                <View style={styles.amountBox}>
                    <Text style={styles.amountLabel}>Amount</Text>
                    <Text style={styles.amountValue}>{parseFloat(item.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.cardContent}>
                <View style={styles.dateRow}>
                    <View style={styles.dateItem}>
                        <Ionicons name="calendar-outline" size={moderateScale(14)} color={Colors.text.tertiary} style={{ marginRight: moderateScale(4) }} />
                        <View>
                            <Text style={styles.dateLabel}>Cheque Date</Text>
                            <Text style={styles.dateValue}>{formatDate(item.chequedate)}</Text>
                        </View>
                    </View>
                    <View style={styles.dateItem}>
                        <Ionicons name="today-outline" size={moderateScale(14)} color={Colors.text.tertiary} style={{ marginRight: moderateScale(4) }} />
                        <View>
                            <Text style={styles.dateLabel}>Collection Date</Text>
                            <Text style={styles.dateValue}>{formatDate(item.colndate)}</Text>
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
                leftIcon={<Ionicons name="arrow-back" size={moderateScale(26)} color={Colors.primary.main} />}
                onLeftPress={() => router.push("/(drawer)/(tabs)")}
            />

            <View style={styles.content}>
                {/* Modern Tab Switcher */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'I' && styles.activeTab]}
                        onPress={() => handleTabChange('I')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="download-outline" size={moderateScale(18)} color={activeTab === 'I' ? '#fff' : Colors.text.secondary} />
                        <Text style={[styles.tabText, activeTab === 'I' && styles.activeTabText]}>Incoming</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'O' && styles.activeTab]}
                        onPress={() => handleTabChange('O')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="paper-plane-outline" size={moderateScale(18)} color={activeTab === 'O' ? '#fff' : Colors.text.secondary} />
                        <Text style={[styles.tabText, activeTab === 'O' && styles.activeTabText]}>Outgoing</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={moderateScale(20)} color={Colors.text.tertiary} style={styles.searchIcon} />
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
                            size={moderateScale(18)}
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
                        <Ionicons name="document-text-outline" size={moderateScale(64)} color={Colors.text.disabled} />
                        <Text style={styles.emptyText}>No {activeTab === 'I' ? 'Incoming' : 'Outgoing'} records found.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredData}
                        renderItem={renderPDCItem}
                        numColumns={Screen.isTablet ? 2 : 1}
                        key={Screen.isTablet ? 'tablet' : 'phone'}
                        keyExtractor={(item, index) => index.toString()}
                        contentContainerStyle={[
                            styles.listContent,
                            { paddingBottom: insets.bottom + Spacing.xl }
                        ]}
                        columnWrapperStyle={Screen.isTablet ? styles.columnWrapper : null}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={[Colors.primary.main]}
                            />
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
    padding: moderateScale(Spacing.base),
  },
    tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: moderateScale(BorderRadius.lg),
    padding: moderateScale(4),
    marginBottom: moderateVerticalScale(Spacing.md),
    ...Shadows.xs,
  },
    tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: moderateVerticalScale(10),
    borderRadius: moderateScale(BorderRadius.md),
    gap: moderateScale(8),
  },
    activeTab: {
        backgroundColor: Colors.primary.main,
        ...Shadows.sm,
    },
    tabText: {
    fontSize: moderateScale(Typography.fontSize.sm),
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
    borderRadius: moderateScale(BorderRadius.md),
    paddingHorizontal: moderateScale(Spacing.md),
    marginBottom: moderateVerticalScale(Spacing.md),
    height: verticalScale(50),
    borderWidth: 1,
    borderColor: Colors.border.light,
    ...Shadows.xs,
  },
    searchIcon: {
        marginRight: Spacing.sm,
    },
    searchInput: {
    flex: 1,
    fontSize: moderateScale(Typography.fontSize.base),
    color: Colors.text.primary,
  },
    pdcCard: {
        marginBottom: Spacing.md,
        padding: Spacing.md,
        backgroundColor: Colors.background.primary,
        flex: Screen.isTablet ? 0.485 : 1,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconCircle: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: moderateScale(Spacing.md),
  },
    partyInfo: {
        flex: 1,
    },
    partyName: {
    fontSize: moderateScale(Typography.fontSize.base),
    fontWeight: '800',
    color: Colors.text.primary,
  },
  chequeNum: {
    fontSize: moderateScale(Typography.fontSize.xs),
    color: Colors.text.secondary,
    marginTop: moderateVerticalScale(2),
  },
    amountBox: {
        alignItems: 'flex-end',
    },
    amountLabel: {
    fontSize: moderateScale(10),
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  amountValue: {
    fontSize: moderateScale(Typography.fontSize.base),
    fontWeight: '800',
    color: Colors.primary.main,
    marginTop: moderateVerticalScale(2),
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
    fontSize: moderateScale(10),
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  dateValue: {
    fontSize: moderateScale(Typography.fontSize.sm),
    color: Colors.text.primary,
    fontWeight: '700',
    marginTop: moderateVerticalScale(2),
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

