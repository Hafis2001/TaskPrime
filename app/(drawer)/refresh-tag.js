import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useState } from "react";
import {
    ActivityIndicator,
    BackHandler,
    FlatList,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ModernCard from "../../components/ui/ModernCard";
import ModernHeader from "../../components/ui/ModernHeader";
import { Colors, Spacing, Typography, BorderRadius, Shadows } from "../../constants/modernTheme";
import { Screen, moderateScale, moderateVerticalScale, verticalScale, isTablet } from "../../src/utils/Responsive";
import { useLicenseModules } from "../../src/utils/useLicenseModules";

const REFRESH_TAG_API = "https://taskprime.app/api/get-refresh-tag/";

export default function RefreshTagScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [logs, setLogs] = useState([]);
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
                const allowed = await checkModule("MOD035", "Refresh Tag", () => {
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
        try {
            const storedUser = await AsyncStorage.getItem("user");
            if (!storedUser) {
                router.replace("/");
                return;
            }
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            fetchLogs(parsedUser);
        } catch (error) {
            console.error("Init error:", error);
            setLoading(false);
        }
    };

    const fetchLogs = async (parsedUser) => {
        try {
            setLoading(true);
            const response = await fetch(
                `${REFRESH_TAG_API}?client_id=${parsedUser.clientId}`,
                {
                    headers: {
                        Accept: "application/json",
                        Authorization: `Bearer ${parsedUser.token}`,
                    },
                }
            );

            const json = await response.json();
            if (json.success && Array.isArray(json.data)) {
                setLogs(json.data);
            } else {
                setLogs([]);
            }
        } catch (error) {
            console.error("âŒ Refresh Tag Fetch error:", error);
            setLogs([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        if (user) fetchLogs(user);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        try {
            const [year, month, day] = dateStr.split("-");
            return `${day}-${month}-${year}`;
        } catch (e) {
            return dateStr;
        }
    };

    const formatTime = (etime) => {
        try {
            const date = new Date(etime);
            return date.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (e) {
            return etime;
        }
    };

    const renderItem = ({ item }) => (
        <ModernCard style={styles.logCard} elevated>
            <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { width: moderateScale(40), height: moderateScale(40), borderRadius: moderateScale(20), marginRight: moderateScale(Spacing.md) }]}>
                    <Ionicons name="sync-circle" size={moderateScale(24)} color={Colors.primary.main} />
                </View>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.remarkText}>{item.remark}</Text>
                    <Text style={styles.userText}>User: {item.userid}</Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.cardFooter}>
                <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={moderateScale(14)} color={Colors.text.tertiary} style={styles.footerIcon} />
                    <Text style={styles.footerText}>{formatDate(item.edate)}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={moderateScale(14)} color={Colors.text.tertiary} style={styles.footerIcon} />
                    <Text style={styles.footerText}>{formatTime(item.etime)}</Text>
                </View>
            </View>
        </ModernCard>
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
            <StatusBar barStyle="dark-content" />
            <ModernHeader
                title="Refresh Tags"
                leftIcon={<Ionicons name="arrow-back" size={moderateScale(26)} color={Colors.primary.main} />}
                onLeftPress={() => router.push("/(drawer)/(tabs)")}
                rightIcon={<Ionicons name="refresh-outline" size={moderateScale(22)} color={Colors.primary.main} />}
                onRightPress={onRefresh}
            />

            {loading && !refreshing ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.primary.main} />
                    <Text style={styles.loadingText}>Fetching logs...</Text>
                </View>
            ) : (
                <FlatList
                    data={logs}
                    renderItem={renderItem}
                    numColumns={Screen.isTablet ? 2 : 1}
                    key={Screen.isTablet ? 'tablet' : 'phone'}
                    keyExtractor={(item, index) => index.toString()}
                    contentContainerStyle={[
                        styles.listContent,
                        { paddingBottom: insets.bottom + Spacing.xl }
                    ]}
                    columnWrapperStyle={Screen.isTablet ? styles.columnWrapper : null}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[Colors.primary.main]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="document-text-outline" size={moderateScale(64)} color={Colors.text.tertiary} />
                            <Text style={styles.emptyText}>No refresh logs found</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background.secondary,
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: moderateVerticalScale(Spacing.md),
        color: Colors.text.secondary,
        fontSize: moderateScale(Typography.fontSize.sm),
    },
    listContent: {
        padding: moderateScale(Spacing.md),
    },
    logCard: {
        marginBottom: moderateVerticalScale(Spacing.md),
        padding: moderateScale(Spacing.md),
        flex: Screen.isTablet ? 0.48 : 1,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: Spacing.sm,
    },
    iconContainer: {
        width: moderateScale(40),
        height: moderateScale(40),
        borderRadius: moderateScale(20),
        backgroundColor: Colors.primary.lightest,
        justifyContent: "center",
        alignItems: "center",
        marginRight: moderateScale(Spacing.md),
    },
    headerTextContainer: {
        flex: 1,
    },
    remarkText: {
        fontSize: moderateScale(Typography.fontSize.base),
        fontWeight: Typography.fontWeight.bold,
        color: Colors.dark.main,
    },
    userText: {
        fontSize: moderateScale(Typography.fontSize.xs),
        color: Colors.primary.main,
        fontWeight: Typography.fontWeight.medium,
        marginTop: moderateVerticalScale(2),
    },
    divider: {
        height: 1,
        backgroundColor: Colors.border.light,
        marginVertical: moderateVerticalScale(Spacing.sm),
    },
    cardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    footerIcon: {
        marginRight: 4,
    },
    footerText: {
        fontSize: moderateScale(Typography.fontSize.xs),
        color: Colors.text.tertiary,
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        marginTop: 100,
    },
    emptyText: {
        marginTop: moderateVerticalScale(Spacing.md),
        fontSize: moderateScale(Typography.fontSize.base),
        color: Colors.text.tertiary,
        fontWeight: Typography.fontWeight.medium,
    },
});

