import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
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
    const [totalValue, setTotalValue] = useState(0);
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
                const allowed = await checkModule("MOD030", "Stock Report", () => {
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

                // Calculate total stock value
                const total = json.data.reduce((acc, item) => {
                    const cost = parseFloat(item.cost || 0);
                    const qty = parseFloat(item.quantity || 0);
                    return acc + (cost * qty);
                }, 0);
                setTotalValue(total);
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

    const renderStockItem = ({ item }) => {
        const isInStock = parseFloat(item.quantity || 0) > 0;
        return (
            <ModernCard style={styles.stockCard} elevated={false}>
                <View style={styles.cardHeader}>
                    <LinearGradient
                        colors={isInStock ? [Colors.primary.lightest, '#FFF9F5'] : ['#FEE2E2', '#FFF9F5']}
                        style={styles.iconCircle}
                    >
                        <Ionicons 
                            name={isInStock ? "cube" : "cube-outline"} 
                            size={moderateScale(22)} 
                            color={isInStock ? Colors.primary.main : Colors.error.main} 
                        />
                    </LinearGradient>
                    <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                        <View style={styles.codeRow}>
                            <Text style={styles.productCode}>#{item.code}</Text>
                            <View style={styles.dot} />
                            <Text style={styles.productCode}>{item.barcode}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.infoGrid}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>MRP</Text>
                            <Text style={styles.bmrpValue}>₹{parseFloat(item.bmrp || 0).toFixed(2)}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Cost</Text>
                            <Text style={styles.costValue}>₹{parseFloat(item.cost || 0).toFixed(2)}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Price</Text>
                            <Text style={styles.salesPriceValue}>₹{parseFloat(item.salesprice || 0).toFixed(2)}</Text>
                        </View>
                        <View style={[styles.infoItem, { alignItems: 'flex-end' }]}>
                            <Text style={[styles.infoLabel, { textAlign: 'right' }]}>Qty</Text>
                            <View style={[styles.qtyBadge, { backgroundColor: isInStock ? Colors.success.bg : Colors.error.bg }]}>
                                <Text style={[styles.qtyText, { color: isInStock ? Colors.success.dark : Colors.error.dark }]}>
                                    {parseFloat(item.quantity || 0)}
                                </Text>
                            </View>
                        </View>
                    </View>
                    
                    <View style={styles.valueRow}>
                        <Text style={styles.valueLabel}>Stock Value:</Text>
                        <Text style={styles.valueText}>₹{(parseFloat(item.cost || 0) * parseFloat(item.quantity || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                    </View>
                </View>
            </ModernCard>
        );
    };

    return (
        <View style={styles.container}>
            <ModernHeader
                title="Stock Report"
                leftIcon={<Ionicons name="arrow-back" size={moderateScale(26)} color={Colors.primary.main} />}
                onLeftPress={() => router.push("/(drawer)/(tabs)")}
            />

            <View style={styles.content}>
                {loading && !refreshing ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={Colors.primary.main} />
                        <Text style={styles.loadingText}>Loading inventory...</Text>
                    </View>
                ) : (
                    <>
                        <FlatList
                            data={filteredData}
                            numColumns={Screen.isTablet ? 2 : 1}
                            key={Screen.isTablet ? 'tablet' : 'phone'}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={renderStockItem}
                            ListHeaderComponent={
                                <View style={styles.searchContainer}>
                                    <Ionicons name="search" size={moderateScale(20)} color={Colors.primary.main} style={styles.searchIcon} />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Search products by name or code..."
                                        placeholderTextColor={Colors.text.tertiary}
                                        value={searchQuery}
                                        onChangeText={(text) => {
                                            setSearchQuery(text);
                                            handleSearch(text);
                                        }}
                                    />
                                    <TouchableOpacity
                                        style={[styles.filterBtn, showStockOnly && styles.filterBtnActive]}
                                        onPress={toggleStockFilter}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="layers" size={moderateScale(16)} color={showStockOnly ? "#fff" : Colors.primary.main} />
                                        <Text style={[styles.filterBtnText, showStockOnly && styles.filterBtnTextActive]}>Stock</Text>
                                    </TouchableOpacity>
                                </View>
                            }
                            contentContainerStyle={[
                                styles.listContent,
                                { paddingBottom: insets.bottom + Spacing.xl + 120 }
                            ]}
                            ListEmptyComponent={
                                <View style={styles.centered}>
                                    <Ionicons name="search-outline" size={moderateScale(64)} color={Colors.text.disabled} />
                                    <Text style={styles.emptyText}>No matching products</Text>
                                </View>
                            }
                            columnWrapperStyle={Screen.isTablet ? styles.columnWrapper : null}
                            showsVerticalScrollIndicator={false}
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary.main]} />
                            }
                        />

                        {/* Floating Stats Card */}
                        <View style={[styles.bottomCardWrapper, { paddingBottom: insets.bottom + moderateVerticalScale(16) }]}>
                            <LinearGradient
                                colors={[Colors.primary.main, Colors.primary.dark]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.bottomCard}
                            >
                                <View style={styles.bottomItem}>
                                    <Text style={styles.bottomLabel}>TOTAL PRODUCTS</Text>
                                    <Text style={styles.bottomValue}>{stockData.length}</Text>
                                </View>
                                <View style={styles.bottomSeparator} />
                                <View style={styles.bottomItem}>
                                    <Text style={styles.bottomLabel}>IN STOCK</Text>
                                    <Text style={[styles.bottomValue, { fontSize: 18 }]}>
                                        {stockData.filter(i => i.quantity > 0).length}
                                    </Text>
                                </View>
                                <View style={styles.bottomSeparator} />
                                <View style={[styles.bottomItem, { flex: 1.5 }]}>
                                    <Text style={styles.bottomLabel}>TOTAL VALUE</Text>
                                    <Text style={[styles.bottomValue, { fontSize: 18 }]}>
                                        ₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </Text>
                                </View>
                            </LinearGradient>
                        </View>
                    </>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFF9F5", // Soft modern peach tint
    },
    content: {
        flex: 1,
        padding: moderateScale(Spacing.base),
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 16,
        marginBottom: 20,
        height: 54,
        ...Shadows.md,
        borderWidth: 1,
        borderColor: '#FFE4D1',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: moderateScale(15),
        color: Colors.dark.main,
        fontWeight: '600',
    },
    filterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF5ED',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 14,
        gap: 6,
        borderWidth: 1,
        borderColor: '#FFE4D1',
    },
    filterBtnActive: {
        backgroundColor: Colors.primary.main,
        borderColor: Colors.primary.main,
    },
    filterBtnText: {
        fontSize: 11,
        fontWeight: '800',
        color: Colors.primary.main,
        textTransform: 'uppercase',
    },
    filterBtnTextActive: {
        color: '#fff',
    },
    stockCard: {
        marginBottom: 16,
        padding: 0,
        backgroundColor: '#fff',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#FFE4D1',
        ...Shadows.sm,
        flex: Screen.isTablet ? 0.485 : 1,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 12,
    },
    iconCircle: {
        width: 52,
        height: 52,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: moderateScale(16),
        fontWeight: '800',
        color: Colors.dark.main,
        lineHeight: 22,
    },
    codeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    productCode: {
        fontSize: 11,
        color: Colors.text.secondary,
        fontWeight: '700',
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: Colors.text.disabled,
        marginHorizontal: 8,
    },
    cardBody: {
        padding: 16,
        paddingTop: 0,
    },
    infoGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        backgroundColor: '#FDFCFB',
        padding: 12,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#F5F0ED',
    },
    infoItem: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 9,
        color: Colors.text.tertiary,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    bmrpValue: {
        fontSize: moderateScale(11),
        color: Colors.text.secondary,
        fontWeight: '600',
    },
    salesPriceValue: {
        fontSize: moderateScale(14),
        fontWeight: '900',
        color: Colors.primary.main,
    },
    costValue: {
        fontSize: moderateScale(11),
        color: Colors.success.main,
        fontWeight: '700',
    },
    qtyBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    qtyText: {
        fontSize: 15,
        fontWeight: '900',
    },
    bottomCardWrapper: {
        paddingHorizontal: 16,
        backgroundColor: 'transparent',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    bottomCard: {
        borderRadius: 24,
        paddingVertical: 14,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        ...Shadows.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    bottomItem: {
        flex: 1,
        alignItems: 'flex-start',
    },
    bottomSeparator: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(255,255,255,0.3)',
        marginHorizontal: 15,
    },
    bottomLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 9,
        fontWeight: "800",
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 2,
    },
    bottomValue: {
        color: '#fff',
        fontSize: 22,
        fontWeight: "900",
        letterSpacing: 0.5,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 60,
    },
    loadingText: {
        marginTop: 12,
        color: Colors.text.secondary,
        fontSize: 14,
        fontWeight: '600',
    },
    emptyText: {
        marginTop: 12,
        color: Colors.text.disabled,
        fontSize: 16,
        fontWeight: '700',
    },
    valueRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F5F5F5',
    },
    valueLabel: {
        fontSize: moderateScale(11),
        color: Colors.text.secondary,
        fontWeight: '600',
    },
    valueText: {
        fontSize: moderateScale(14),
        fontWeight: '900',
        color: Colors.dark.main,
    },
});
