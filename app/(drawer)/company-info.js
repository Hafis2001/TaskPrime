import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

const API_URL = "https://taskprime.app/api/get-misel-data/";

export default function CompanyInfoScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [companyData, setCompanyData] = useState(null);
  const [user, setUser] = useState({ name: "", clientId: "", token: "" });
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const loadUserAndCompany = async () => {
      const storedUser = await AsyncStorage.getItem("user");
      if (!storedUser) {
        console.log("⚠️ No user found, redirecting to login...");
        router.replace("/LoginScreen");
        return;
      }

      const parsedUser = JSON.parse(storedUser);
      setUser({
        name: parsedUser.name,
        clientId: parsedUser.clientId,
        token: parsedUser.token,
      });

      try {
        const response = await fetch(
          `${API_URL}?client_id=${parsedUser.clientId}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${parsedUser.token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const json = await response.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const c = json.data[0];
          const company = {
            firm_name: c.firm_name,
            address: c.address,
            address1: c.address1,
            address2: c.address2,
            address3: c.address3,
            phones: c.phones,
            mobile: c.mobile,
            pagers: c.pagers,
            tinno: c.tinno,
          };
          setCompanyData(company);
        } else {
          setCompanyData(null);
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
    await AsyncStorage.removeItem("user");
    setShowLogoutModal(false);
    router.replace("/");
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF914D" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Company Info</Text>
        <TouchableOpacity onPress={() => setShowLogoutModal(true)}>
          <Icon name="log-out-outline" size={28} color="#FF914D" />
        </TouchableOpacity>
      </View>

      {/* User Card */}
      <View style={styles.userCard}>
        <Text style={styles.welcomeText}>Welcome, {user.name}</Text>
        <Text style={styles.clientId}>Client ID: {user.clientId}</Text>
      </View>

      {/* Company Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Company Details</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Firm Name</Text>
          <Text style={styles.value}>{companyData?.firm_name || "Not Available"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Address</Text>
          <Text style={styles.value}>{companyData?.address || "Not Available"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Address Line 1</Text>
          <Text style={styles.value}>{companyData?.address1 || "Not Available"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Address Line 2</Text>
          <Text style={styles.value}>{companyData?.address2 || "Not Available"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Address Line 3</Text>
          <Text style={styles.value}>{companyData?.address3 || "Not Available"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Phone Number</Text>
          <Text style={styles.value}>
            {companyData?.phones || companyData?.mobile || "Not Available"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>GST Number</Text>
          <Text style={styles.value}>{companyData?.tinno || "Not Available"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{companyData?.pagers || "Not Available"}</Text>
        </View>
      </View>

      {/* Logout Modal */}
      <Modal
        transparent
        animationType="fade"
        visible={showLogoutModal}
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalText}>
              Hey, {user.name} 👋{"\n"}Are you logging out?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.yesButton} onPress={confirmLogout}>
                <Text style={styles.buttonText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.noButton}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.buttonText}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF", padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginLeft: 90,
    color: "#FF914D",
  },
  userCard: {
    backgroundColor: "#f9d5b7ff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeText: { fontSize: 18, fontWeight: "bold" },
  clientId: { fontSize: 14, color: "#777" },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderColor: "#EEE",
  },
  label: {
    fontWeight: "800",
    color: "#FF914D",
    flex: 1,
    marginTop: 20,
  },
  value: {
    flex: 2,
    color: "#141313ff",
    textAlign: "right",
    marginTop: 20,
    fontSize: 15,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    width: "80%",
    alignItems: "center",
    elevation: 10,
  },
  modalText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  yesButton: {
    backgroundColor: "#FF914D",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  noButton: {
    backgroundColor: "#aaa",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: { color: "#fff", fontWeight: "bold" },
});
