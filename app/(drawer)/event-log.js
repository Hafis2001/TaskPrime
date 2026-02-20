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
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ModernCard from "../../components/ui/ModernCard";
import ModernHeader from "../../components/ui/ModernHeader";
import { BorderRadius, Colors, Shadows, Spacing, Typography } from "../../constants/modernTheme";

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
        fetchEventLog(parsedUser);
    };

    useEffect(() => {
        init();
    }, []);

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
            console.error("❌ Event Log Fetch error:", error);
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
                            <Ionicons name="calendar-outline" size={12} color={Colors.text.tertiary} />
                            <Text style={styles.dateTimeText}>{item.edate}</Text>
                            <Ionicons name="time-outline" size={12} color={Colors.text.tertiary} style={{ marginLeft: 8 }} />
                            <Text style={styles.dateTimeText}>{item.etime}</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.cardContent}>
                <View style={styles.eventDescriptionBox}>
                    <Ionicons name="information-circle-outline" size={18} color={Colors.primary.main} style={styles.eventIcon} />
                    <Text style={styles.eventDescription}>{item.sevent.trim()}</Text>
                </View>
            </View>
        </ModernCard>
    );

    return (
        <View style={styles.container}>
            <ModernHeader
                title="Event Log"
                leftIcon={<Ionicons name="menu-outline" size={26} color={Colors.primary.main} />}
                onLeftPress={() => navigation.toggleDrawer()}
            />

            <View style={styles.content}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={20} color={Colors.text.tertiary} style={styles.searchIcon} />
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
                            size={20}
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
                        <Ionicons name="list-outline" size={64} color={Colors.text.disabled} />
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
        padding: Spacing.base,
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
