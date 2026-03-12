import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import { useNavigation, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import {
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ModernButton from "../../../components/ui/ModernButton";
import ModernCard from "../../../components/ui/ModernCard";
import ModernHeader from "../../../components/ui/ModernHeader";
import { BorderRadius, Colors, Spacing, Typography, Shadows } from "../../../constants/modernTheme";
import { Screen, moderateScale, moderateVerticalScale, verticalScale, isTablet } from "../../../src/utils/Responsive";

export default function LicenseInfoScreen() {
    const router = useRouter();
    const [licenseKey, setLicenseKey] = useState("");
    const [deviceId, setDeviceId] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [clientId, setClientId] = useState("");
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();

    useEffect(() => {
        loadStoredData();
    }, []);

    const loadStoredData = async () => {
        try {
            const storedLicenseKey = await AsyncStorage.getItem("licenseKey");
            const storedDeviceId = await AsyncStorage.getItem("deviceId");
            const storedCustomerName = await AsyncStorage.getItem("customerName");
            const storedClientId = await AsyncStorage.getItem("clientId");
 
            setLicenseKey(storedLicenseKey || "Not Available");
            setDeviceId(storedDeviceId || "Not Available");
            setCustomerName(storedCustomerName || "Valued Customer");
            setClientId(storedClientId || "");
        } catch (error) {
            console.error(error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadStoredData();
        setRefreshing(false);
    };

    const handleRemoveLicense = async () => {
        Alert.alert(
            "Remove License",
            "Are you sure? Does not effect your subscription but deactivates this device.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: removeLicense
                }
            ]
        );
    };

    const removeLicense = async () => {
        setLoading(true);
        try {
            const LOGOUT_API = "https://activate.imcbs.com/mobileapp/api/project/taskprime/logout/";

            // Attempt generic logout API call
            try {
                await fetch(LOGOUT_API, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ license_key: licenseKey, device_id: deviceId })
                });
            } catch (e) {
                console.warn("Logout API failed, continuing local cleanup", e);
            }

            // SecureStore cleanup for current shop
            if (clientId) {
                const safeId = String(clientId).trim().toUpperCase();
                await SecureStore.deleteItemAsync(`savedUsername_${safeId}`).catch(() => { });
                await SecureStore.deleteItemAsync(`savedPassword_${safeId}`).catch(() => { });
            }

            // Local cleanup - CLEAR EVERYTHING related to license and sessions
            await AsyncStorage.multiRemove([
                "licenseActivated",
                "licenseKey",
                "deviceId",
                "customerName",
                "clientId",
                "user",
                "authToken",
                "loginTimestamp",
                "knownLicenses"
            ]);

            Alert.alert("License Removed", "License has been removed successfully.", [
                {
                    text: "OK",
                    onPress: () => {
                        // Forceful reset to root to ensure app state reloads
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'index' }],
                        });
                    }
                }
            ]);
        } catch (e) {
            Alert.alert("Error", "Failed to remove license.");
        } finally {
            setLoading(false);
        }
    };

    const InfoRow = ({ label, value, icon }) => (
        <View style={styles.infoRow}>
            <View style={styles.labelContainer}>
                {icon && <Ionicons name={icon} size={moderateScale(16)} color={Colors.primary.main} style={styles.rowIcon} />}
                <Text style={styles.label}>{label}</Text>
            </View>
            <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">{value}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <ModernHeader
                title="License Info"
                leftIcon={<Ionicons name="menu-outline" size={moderateScale(26)} color={Colors.primary.main} />}
                onLeftPress={() => navigation.toggleDrawer()}
            />

            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary.main]} />}
                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        paddingBottom: insets.bottom + moderateVerticalScale(Spacing.xl),
                        width: Screen.isTablet ? moderateScale(600) : '100%',
                        alignSelf: 'center',
                    }
                ]}
                showsVerticalScrollIndicator={false}
            >
                <ModernCard style={styles.mainCard} elevated>
                    <View style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="shield-checkmark" size={moderateScale(28)} color={Colors.primary.main} />
                            </View>
                            <View>
                                <Text style={styles.cardTitle}>Active License</Text>
                                <Text style={styles.cardSubtitle}>Valid & Active</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <InfoRow label="Customer" value={customerName} icon="business-outline" />
                        <InfoRow label="License Key" value={licenseKey} icon="key-outline" />
                        <InfoRow label="Device ID" value={deviceId} icon="hardware-chip-outline" />
                        <InfoRow label="App ID" value={Application.applicationId || "N/A"} icon="apps-outline" />
                    </View>
                </ModernCard>

                <View style={styles.actionsContainer}>
                    <ModernButton
                        title="Remove License"
                        onPress={handleRemoveLicense}
                        loading={loading}
                        disabled={loading}
                        variant="danger"
                        icon={<Ionicons name="log-out-outline" size={moderateScale(20)} color="#fff" />}
                    />
                    <Text style={styles.warningText}>
                        Removing license will deactivate this device.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background.secondary
    },
    scrollContent: {
        padding: moderateScale(Spacing.lg)
    },
    mainCard: {
        padding: 0,
        marginBottom: moderateVerticalScale(Spacing.xl),
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.border.light,
    },
    cardContent: {
        padding: moderateScale(Spacing.xl),
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: moderateVerticalScale(Spacing.lg)
    },
    iconContainer: {
        width: moderateScale(48),
        height: moderateScale(48),
        borderRadius: moderateScale(24),
        backgroundColor: Colors.primary.lightest,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: moderateScale(Spacing.md),
    },
    cardTitle: {
        fontSize: moderateScale(Typography.fontSize.xl),
        fontWeight: Typography.fontWeight.bold,
        color: Colors.dark.main
    },
    cardSubtitle: {
        fontSize: moderateScale(Typography.fontSize.sm),
        color: Colors.success.main,
        fontWeight: Typography.fontWeight.medium,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.border.light,
        marginBottom: moderateVerticalScale(Spacing.lg),
    },
    infoRow: {
        marginBottom: moderateVerticalScale(Spacing.lg)
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    rowIcon: {
        marginRight: moderateScale(Spacing.xs),
    },
    label: {
        fontSize: moderateScale(Typography.fontSize.xs),
        color: Colors.text.tertiary,
        textTransform: 'uppercase',
        fontWeight: Typography.fontWeight.bold,
        letterSpacing: 0.5,
    },
    value: {
        fontSize: moderateScale(Typography.fontSize.base),
        color: Colors.text.primary,
        fontWeight: Typography.fontWeight.semibold
    },
    actionsContainer: {
        paddingHorizontal: moderateScale(Spacing.md),
    },
    warningText: {
        textAlign: 'center',
        color: Colors.text.tertiary,
        fontSize: moderateScale(Typography.fontSize.xs),
        marginTop: moderateVerticalScale(Spacing.md),
    },
});
