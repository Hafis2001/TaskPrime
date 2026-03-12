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

const STOCK_API_URL = "https://taskprime.app/api/get-stock-report/";

export default function StockReportScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stockData, setStockData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showStockOnly, setShowStockOnly] = useState(false);
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
                const allowed = await checkModule("MOD037", "Stock Report", () => {
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
        // The license check logic is now moved to the useEffect below
        const storedUser = await AsyncStorage.getItem("user");
        if (!storedUser) {
            router.replace("/");
            return;
        }
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        fetchStockReport(parsedUser);
    };



    const fetchStockReport = async (parsedUser) => {
        try {
            setLoading(true);
            const response = await fetch(
                `${STOCK_API_URL}?client_id=${parsedUser.clientId}`,
                {
                    headers: {
                        Accept: "application/json",
                        Authorization: `Bearer ${parsedUser.token}`,
                    },
                }
            );

            const json = await response.json();
            if (json.success && Array.isArray(json.data)) {
                setStockData(json.data);
                // Apply initial filters if any
                let initialFiltered = json.data;
                if (searchQuery) {
                    initialFiltered = initialFiltered.filter((item) =>
                        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.barcode.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                }
                if (showStockOnly) {
                    initialFiltered = initialFiltered.filter((item) => parseFloat(item.quantity) > 0);
                }
                setFilteredData(initialFiltered);
            } else {
                setStockData([]);
                setFilteredData([]);
            }
        } catch (error) {
            console.error("âŒ Stock Fetch error:", error);
            setStockData([]);
            setFilteredData([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        if (user) fetchStockReport(user);
    };

    if (isLicensed === null) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background.secondary }}>
                <ActivityIndicator size="large" color={Colors.primary.main} />
            </View>
        );
    }
    if (!isLicensed) return null;

    const handleSearch = (textOrToggleValue) => {
        // Determine if the call is from text input or toggle
        const isTextInput = typeof textOrToggleValue === 'string';
        const newSearchQuery = isTextInput ? textOrToggleValue : searchQuery;
        const newShowStockOnly = isTextInput ? showStockOnly : textOrToggleValue;

        let filtered = stockData;

        if (newSearchQuery) {
            filtered = filtered.filter((item) =>
                item.name.toLowerCase().includes(newSearchQuery.toLowerCase()) ||
                item.code.toLowerCase().includes(newSearchQuery.toLowerCase()) ||
                item.barcode.toLowerCase().includes(newSearchQuery.toLowerCase())
            );
        }

        if (newShowStockOnly) {
            filtered = filtered.filter((item) => parseFloat(item.quantity) > 0);
        }

        setFilteredData(filtered);
    };

    const toggleStockFilter = () => {
        const newValue = !showStockOnly;
        setShowStockOnly(newValue);
        handleSearch(newValue); // Pass the new boolean value to handleSearch
    };

    const renderStockItem = ({ item }) => (
        <ModernCard style={styles.stockCard} elevated={true}>
            <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                    <Ionicons name="cube-outline" size={moderateScale(20)} color={Colors.primary.main} />
                </View>
                <View style={styles.productInfo}>
                    <Text style={styles.productName}>{item.name}</Text>
                    <Text style={styles.productCode}>Code: {item.code}</Text>
                </View>
                <View style={[styles.badge, item.quantity > 0 ? styles.badgeInStock : styles.badgeOutStock]}>
                    <Text style={styles.badgeText}>{item.quantity > 0 ? 'IN STOCK' : 'OUT'}</Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.cardContent}>
                <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Barcode</Text>
                        <Text style={styles.detailValue}>{item.barcode}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Product Code</Text>
                        <Text style={styles.detailValue}>{item.productcode}</Text>
                    </View>
                </View>

                <View style={styles.priceRow}>
                    <View style={styles.priceItem}>
                        <Text style={styles.priceLabel}>BMRP</Text>
                        <Text style={styles.bmrpValue}>â‚¹{parseFloat(item.bmrp || 0).toFixed(2)}</Text>
                    </View>
                    <View style={styles.priceItem}>
                        <Text style={styles.priceLabel}>Sales Price</Text>
                        <Text style={styles.salesPriceValue}>â‚¹{parseFloat(item.salesprice || 0).toFixed(2)}</Text>
                    </View>
                    <View style={[styles.priceItem, styles.stockItem]}>
                        <Text style={styles.stockLabel}>Stock</Text>
                        <Text style={[styles.stockValue, { color: item.quantity > 0 ? Colors.success.main : Colors.error?.main || '#ff4444' }]}>
                            {parseFloat(item.quantity || 0)}
                        </Text>
                    </View>
                </View>
            </View>
        </ModernCard>
    );

    return (
        <View style={styles.container}>
            <ModernHeader
                title="Stock Report"
                leftIcon={<Ionicons name="arrow-back" size={moderateScale(26)} color={Colors.primary.main} />}
                onLeftPress={() => router.push("/(drawer)/(tabs)")}
            />

            <View style={styles.content}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={moderateScale(20)} color={Colors.text.tertiary} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search products..."
                        placeholderTextColor={Colors.text.disabled}
                        value={searchQuery}
                        onChangeText={(text) => {
                            setSearchQuery(text);
                            handleSearch(text);
                        }}
                    />
                    {searchQuery !== "" && (
                        <Ionicons
                            name="close-circle"
                            size={moderateScale(18)}
                            color={Colors.text.disabled}
                            onPress={() => {
                                setSearchQuery("");
                                handleSearch("");
                            }}
                            style={{ marginRight: 10 }}
                        />
                    )}
                    <TouchableOpacity
                        style={[styles.filterBtn, showStockOnly && styles.filterBtnActive]}
                        onPress={toggleStockFilter}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="funnel-outline" size={moderateScale(16)} color={showStockOnly ? "#fff" : Colors.primary.main} />
                        <Text style={[styles.filterBtnText, showStockOnly && styles.filterBtnTextActive]}>Stock Only</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statsBox}>
                        <Text style={styles.statsLabel}>TOTAL PRODUCTS</Text>
                        <Text style={styles.statsValue}>{stockData.length}</Text>
                    </View>
                    <View style={styles.statsBox}>
                        <Text style={styles.statsLabel}>IN STOCK</Text>
                        <Text style={[styles.statsValue, { color: Colors.success.main }]}>
                            {stockData.filter(i => i.quantity > 0).length}
                        </Text>
                    </View>
                </View>

                {loading && !refreshing ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={Colors.primary.main} />
                        <Text style={styles.loadingText}>Fetching Stock Data...</Text>
                    </View>
                ) : filteredData.length === 0 ? (
                    <View style={styles.centered}>
                        <Ionicons name="cube-outline" size={moderateScale(64)} color={Colors.text.disabled} />
                        <Text style={styles.emptyText}>No products found.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredData}
                        numColumns={Screen.isTablet ? 2 : 1}
                        key={Screen.isTablet ? 'tablet' : 'phone'}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={renderStockItem}
                        contentContainerStyle={[
                            styles.listContent,
                            { paddingBottom: insets.bottom + Spacing.xl }
                        ]}
                        columnWrapperStyle={Screen.isTablet ? styles.columnWrapper : null}
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
    padding: moderateScale(Spacing.base),
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
    filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.lightest,
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateVerticalScale(6),
    borderRadius: moderateScale(BorderRadius.sm),
    gap: moderateScale(4),
  },
    filterBtnActive: {
        backgroundColor: Colors.primary.main,
    },
    filterBtnText: {
        fontSize: 10,
        fontWeight: '700',
        color: Colors.primary.main,
    },
    filterBtnTextActive: {
        color: '#fff',
    },
    searchIcon: {
        marginRight: Spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: Typography.fontSize.base,
        color: Colors.text.primary,
    },
    statsRow: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    statsBox: {
        flex: 1,
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border.light,
        ...Shadows.xs,
    },
    statsLabel: {
    fontSize: moderateScale(Typography.fontSize.xs),
    color: Colors.text.secondary,
    fontWeight: '700',
    marginBottom: moderateVerticalScale(4),
  },
  statsValue: {
    fontSize: moderateScale(Typography.fontSize.xl),
    fontWeight: '800',
    color: Colors.dark.main,
  },
    stockCard: {
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
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    backgroundColor: Colors.primary.lightest,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: moderateScale(Spacing.md),
  },
    productInfo: {
        flex: 1,
    },
    productName: {
    fontSize: moderateScale(Typography.fontSize.base),
    fontWeight: '700',
    color: Colors.text.primary,
  },
  productCode: {
    fontSize: moderateScale(Typography.fontSize.xs),
    color: Colors.text.secondary,
    marginTop: moderateVerticalScale(2),
  },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    badgeInStock: {
        backgroundColor: Colors.success.lightest || '#e6fffa',
    },
    badgeOutStock: {
        backgroundColor: '#fff5f5',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: Colors.success.main,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.border.light,
        marginVertical: Spacing.md,
    },
    cardContent: {
        gap: Spacing.md,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    detailItem: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 10,
        color: Colors.text.tertiary,
        textTransform: 'uppercase',
        fontWeight: '600',
        marginBottom: 2,
    },
    detailValue: {
        fontSize: Typography.fontSize.sm,
        color: Colors.text.primary,
        fontWeight: '600',
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: Colors.background.secondary,
        padding: Spacing.sm,
        borderRadius: BorderRadius.sm,
    },
    priceItem: {
        alignItems: 'center',
    },
    priceLabel: {
    fontSize: moderateScale(10),
    color: Colors.text.tertiary,
    marginBottom: moderateVerticalScale(2),
  },
  bmrpValue: {
    fontSize: moderateScale(Typography.fontSize.sm),
    color: Colors.text.secondary,
    // textDecorationLine: 'line-through',
  },
  salesPriceValue: {
    fontSize: moderateScale(Typography.fontSize.base),
    fontWeight: '700',
    color: Colors.primary.main,
  },
  stockItem: {
    minWidth: moderateScale(60),
  },
  stockLabel: {
    fontSize: moderateScale(10),
    color: Colors.text.tertiary,
    marginBottom: moderateVerticalScale(2),
  },
  stockValue: {
    fontSize: moderateScale(Typography.fontSize.lg),
    fontWeight: '800',
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

