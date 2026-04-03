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
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ModernCard from "../../components/ui/ModernCard";
import ModernHeader from "../../components/ui/ModernHeader";
import { BorderRadius, Colors, Shadows, Spacing, Typography } from "../../constants/modernTheme";
import { moderateScale, moderateVerticalScale, verticalScale, isTablet, Screen } from "../../src/utils/Responsive";
import { useLicenseModules } from "../../src/utils/useLicenseModules";

const EVENT_LOG_API_URL = "https://taskprime.app/api/get-eventlog/";

export default function EventLogScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [eventData, setEventData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
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
            const runCheck = async () => { setIsLicensed(null);
                const allowed = await checkModule("MOD031", "Event Log", () => {
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
        const storedUser = await AsyncStorage.getItem("user");
        if (!storedUser) {
            router.replace("/");
            return;
        }
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        fetchEventLog(parsedUser);
    };

    const fetchEventLog = async (parsedUser) => {
        try {
            setLoading(true);
            const response = await fetch(
                `${EVENT_LOG_API_URL}?client_id=${parsedUser.clientId}`,
                {
                    headers: {
                        Accept: "application/json",
                        Authorization: `Bearer ${parsedUser.token}`,
                    },
                }
            );

            const json = await response.json();
            if (json.success && Array.isArray(json.data)) {
                setEventData(json.data);
                setFilteredData(json.data);
            } else {
                setEventData([]);
                setFilteredData([]);
            }
        } catch (error) {
            console.error("âŒ Event Log Fetch error:", error);
            setEventData([]);
            setFilteredData([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleSearch = (text) => {
        setSearchQuery(text);
        if (!text) {
            setFilteredData(eventData);
            return;
        }
        const filtered = eventData.filter((item) =>
            item.sevent.toLowerCase().includes(text.toLowerCase()) ||
            item.uid.toLowerCase().includes(text.toLowerCase())
        );
        setFilteredData(filtered);
    };

    const onRefresh = () => {
        setRefreshing(true);
        if (user) fetchEventLog(user);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        const parts = dateStr.split("-");
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dateStr;
    };

    const renderEventItem = ({ item }) => (
        <ModernCard style={styles.eventCard} elevated={true}>
            <View style={styles.cardHeader}>
                <View style={styles.userSection}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{item.uid.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View>
                        <Text style={styles.userName}>{item.uid}</Text>
                        <View style={styles.dateTimeRow}>
                            <Ionicons name="calendar-outline" size={moderateScale(12)} color={Colors.text.tertiary} />
                            <Text style={styles.dateTimeText}>{formatDate(item.edate)}</Text>
                            <Ionicons name="time-outline" size={moderateScale(12)} color={Colors.text.tertiary} style={{ marginLeft: moderateScale(8) }} />
                            <Text style={styles.dateTimeText}>{item.etime}</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.cardContent}>
                <View style={styles.eventDescriptionBox}>
                    <Ionicons name="information-circle-outline" size={moderateScale(18)} color={Colors.primary.main} style={styles.eventIcon} />
                    <Text style={styles.eventDescription}>{item.sevent.trim()}</Text>
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
            <ModernHeader
                title="Event Log"
                leftIcon={<Ionicons name="arrow-back" size={moderateScale(26)} color={Colors.primary.main} />}
                onLeftPress={() => router.push("/(drawer)/(tabs)")}
            />

            <View style={styles.content}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={moderateScale(20)} color={Colors.text.tertiary} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search events or users..."
                        placeholderTextColor={Colors.text.disabled}
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                    {searchQuery !== "" && (
                        <Ionicons
                            name="close-circle"
                            size={moderateScale(20)}
                            color={Colors.text.disabled}
                            onPress={() => handleSearch("")}
                        />
                    )}
                </View>

                {loading && !refreshing ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={Colors.primary.main} />
                        <Text style={styles.loadingText}>Loading Activity Logs...</Text>
                    </View>
                ) : filteredData.length === 0 ? (
                    <View style={styles.centered}>
                        <Ionicons name="list-outline" size={moderateScale(64)} color={Colors.text.disabled} />
                        <Text style={styles.emptyText}>No events found.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredData}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={renderEventItem}
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
    padding: moderateScale(Spacing.base),
  },
    searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    height: 52,
    borderWidth: 1,
    borderColor: Colors.border.light,
    ...Shadows.sm,
    width: Screen.isTablet ? 600 : '100%',
    alignSelf: 'center',
  },
    searchIcon: {
        marginRight: Spacing.sm,
    },
    searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    fontWeight: "500",
  },
    eventCard: {
        marginBottom: Spacing.md,
        padding: Spacing.md,
        backgroundColor: Colors.background.primary,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    userSection: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
    },
    avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary.lightest,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.primary.light,
  },
    avatarText: {
        color: Colors.primary.main,
        fontWeight: "bold",
        fontSize: Typography.fontSize.lg,
    },
    userName: {
    fontSize: Typography.fontSize.base,
    fontWeight: "700",
    color: Colors.text.primary,
  },
    dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 4,
  },
    dateTimeText: {
        fontSize: 11,
        color: Colors.text.tertiary,
        fontWeight: "500",
    },
    divider: {
        height: 1,
        backgroundColor: Colors.border.light,
        marginVertical: Spacing.md,
    },
    cardContent: {
        paddingBottom: 4,
    },
    eventDescriptionBox: {
    flexDirection: "row",
    backgroundColor: Colors.background.secondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary.main,
  },
    eventIcon: {
        marginTop: 2,
        marginRight: Spacing.sm,
    },
    eventDescription: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
    fontWeight: "500",
  },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
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

