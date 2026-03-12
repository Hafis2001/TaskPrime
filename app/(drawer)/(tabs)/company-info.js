import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    BackHandler,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ModernButton from "../../../components/ui/ModernButton";
import ModernCard from "../../../components/ui/ModernCard";
import ModernHeader from "../../../components/ui/ModernHeader";
import { Colors, Spacing, Typography, BorderRadius, Shadows } from "../../../constants/modernTheme";
import { Screen, moderateScale, moderateVerticalScale, verticalScale, isTablet } from "../../../src/utils/Responsive";
import { useLicenseModules } from "../../../src/utils/useLicenseModules";

const API_URL = "https://taskprime.app/api/get-misel-data/";

export default function CompanyInfoScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [companyData, setCompanyData] = useState(null);
    const [user, setUser] = useState({ name: "", clientId: "", token: "" });
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: false,
        });
    }, [navigation]);

    useFocusEffect(
        useCallback(() => {
            const backHandler = BackHandler.addEventListener(
                "hardwareBackPress",
                () => {
                    router.replace("/(drawer)/(tabs)");
                    return true;
                }
            );
            return () => backHandler.remove();
        }, [])
    );

    useEffect(() => {
        const loadUserAndCompany = async () => {
            const storedUser = await AsyncStorage.getItem("user");
            if (!storedUser) {
                Alert.alert("Session Expired", "Please login again.");
                router.replace("/");
                setLoading(false);
                return;
            }
            const parsedUser = JSON.parse(storedUser);
            setUser({
                name: parsedUser.name,
                clientId: parsedUser.clientId,
                token: parsedUser.token,
            });

            try {
                const response = await fetch(`${API_URL}?client_id=${parsedUser.clientId}`, {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                        Authorization: `Bearer ${parsedUser.token}`,
                    },
                });

                const json = await response.json();
                if (json.success && Array.isArray(json.data) && json.data.length > 0) {
                    const c = json.data[0];
                    setCompanyData({
                        firm_name: c.firm_name,
                        address: c.address,
                        address1: c.address1,
                        address2: c.address2,
                        address3: c.address3,
                        phones: c.phones,
                        mobile: c.mobile,
                        pagers: c.pagers,
                        tinno: c.tinno,
                    });
                }
            } catch (error) {
                console.error("❌ Error fetching company data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadUserAndCompany();
    }, []);

    const confirmLogout = async () => {
        console.log("🚀 Logout initiated from CompanyInfo");
        setShowLogoutModal(false);

        // Clear session immediately
        try {
            await AsyncStorage.multiRemove(["user", "authToken", "loginTimestamp"]);
            console.log("🧹 Session data cleared");
        } catch (e) {
            console.error("Storage error:", e);
        }

        // Forceful reset to root index screen
        setTimeout(() => {
            console.log("🔄 Resetting navigation to Login screen...");
            navigation.reset({
                index: 0,
                routes: [{ name: 'index' }],
            });
        }, 200);
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.primary.main} />
            </View>
        );
    }

    const InfoRow = ({ label, value }) => (
        <View style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value || "Not Available"}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <ModernHeader
                title="Company Info"
                leftIcon={<Ionicons name="menu-outline" size={moderateScale(26)} color={Colors.primary.main} />}
                onLeftPress={() => navigation.toggleDrawer()}
                rightIcon={<Ionicons name="log-out-outline" size={moderateScale(26)} color={Colors.primary.main} />}
                onRightPress={() => setShowLogoutModal(true)}
            />

            <ScrollView
                contentContainerStyle={{
                    padding: moderateScale(Spacing.base),
                    paddingBottom: insets.bottom + moderateVerticalScale(30),
                    width: Screen.isTablet ? moderateScale(600) : '100%',
                    alignSelf: 'center',
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* User Card */}
                <ModernCard style={styles.userCard} elevated gradient>
                    <View style={styles.userCardContent}>
                        <View style={styles.avatarContainer}>
                            <Text style={styles.avatarText}>
                                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                            </Text>
                        </View>
                        <View>
                            <Text style={styles.welcomeText}>Welcome, {user.name}</Text>
                            <Text style={styles.clientId}>Client ID: {user.clientId}</Text>
                        </View>
                    </View>
                </ModernCard>

                {/* Company Details */}
                <ModernCard style={styles.detailsCard} elevated>
                    <View style={styles.cardHeader}>
                        <Ionicons name="business" size={moderateScale(24)} color={Colors.primary.main} style={{ marginRight: moderateScale(8) }} />
                        <Text style={styles.cardTitle}>Company Details</Text>
                    </View>

                    <View style={styles.divider} />

                    <InfoRow label="Firm Name" value={companyData?.firm_name} />
                    <InfoRow label="Address" value={companyData?.address} />
                    <InfoRow label="Address Line 1" value={companyData?.address1} />
                    <InfoRow label="Address Line 2" value={companyData?.address2} />
                    <InfoRow label="Address Line 3" value={companyData?.address3} />
                    <InfoRow label="Phone Number" value={companyData?.phones || companyData?.mobile} />
                    <InfoRow label="GST Number" value={companyData?.tinno} />
                    <InfoRow label="Email" value={companyData?.pagers} />
                </ModernCard>
            </ScrollView>

            {/* Logout Modal */}
            <Modal
                transparent
                animationType="fade"
                visible={showLogoutModal}
                onRequestClose={() => setShowLogoutModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <ModernCard style={styles.modalCard} elevated>
                        <View style={styles.modalIconContainer}>
                            <Ionicons name="log-out" size={moderateScale(32)} color={Colors.primary.main} />
                        </View>

                        <Text style={styles.modalTitle}>Logging Out?</Text>
                        <Text style={styles.modalText}>
                            Hey {user.name}, are you sure you want to log out?
                        </Text>

                        <View style={styles.modalButtons}>
                            <ModernButton
                                title="Cancel"
                                onPress={() => setShowLogoutModal(false)}
                                variant="outline"
                                style={styles.modalButton}
                                size="small"
                            />
                            <View style={{ width: moderateScale(Spacing.md) }} />
                            <ModernButton
                                title="Yes, Logout"
                                onPress={confirmLogout}
                                variant="primary"
                                gradient
                                style={styles.modalButton}
                                size="small"
                            />
                        </View>
                    </ModernCard>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background.secondary
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
    },
    userCard: {
        marginBottom: moderateVerticalScale(Spacing.lg),
        padding: 0,
    },
    userCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: moderateScale(Spacing.lg),
    },
    avatarContainer: {
        width: moderateScale(50),
        height: moderateScale(50),
        borderRadius: moderateScale(25),
        backgroundColor: Colors.primary.lightest,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: moderateScale(Spacing.md),
        borderWidth: 1,
        borderColor: Colors.primary.light,
    },
    avatarText: {
        fontSize: moderateScale(Typography.fontSize['2xl']),
        fontWeight: Typography.fontWeight.bold,
        color: Colors.primary.dark,
    },
    welcomeText: {
        fontSize: moderateScale(Typography.fontSize.lg),
        fontWeight: Typography.fontWeight.bold,
        color: '#FFFFFF',
    },
    clientId: {
        fontSize: moderateScale(Typography.fontSize.sm),
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: moderateVerticalScale(2),
    },
    detailsCard: {
        padding: moderateScale(Spacing.lg),
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: moderateVerticalScale(Spacing.md),
    },
    cardTitle: {
        fontSize: moderateScale(Typography.fontSize.xl),
        fontWeight: Typography.fontWeight.bold,
        color: Colors.dark.main,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.border.light,
        marginBottom: moderateVerticalScale(Spacing.md),
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: moderateVerticalScale(Spacing.sm),
        borderBottomWidth: 0.5,
        borderColor: Colors.border.light,
    },
    label: {
        fontWeight: Typography.fontWeight.semibold,
        color: Colors.primary.main,
        flex: 1,
        fontSize: moderateScale(Typography.fontSize.sm),
    },
    value: {
        flex: 2,
        color: Colors.text.primary,
        textAlign: "right",
        fontSize: moderateScale(Typography.fontSize.base),
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: moderateScale(Spacing.xl),
    },
    modalCard: {
        width: Screen.isTablet ? moderateScale(400) : "100%",
        alignItems: "center",
        padding: moderateScale(Spacing.xl),
    },
    modalIconContainer: {
        width: moderateScale(60),
        height: moderateScale(60),
        borderRadius: moderateScale(30),
        backgroundColor: Colors.primary.lightest,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: moderateVerticalScale(Spacing.lg),
    },
    modalTitle: {
        fontSize: moderateScale(Typography.fontSize['2xl']),
        fontWeight: Typography.fontWeight.bold,
        color: Colors.dark.main,
        marginBottom: moderateVerticalScale(Spacing.sm),
    },
    modalText: {
        fontSize: moderateScale(Typography.fontSize.base),
        color: Colors.text.secondary,
        textAlign: "center",
        marginBottom: moderateVerticalScale(Spacing.xl),
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "center",
        width: "100%",
    },
    modalButton: {
        flex: 1,
    },
});
