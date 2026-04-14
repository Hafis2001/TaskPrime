import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ModernCard from "../../components/ui/ModernCard";
import ModernHeader from "../../components/ui/ModernHeader";
import { Colors, Spacing, Typography, Shadows } from "../../constants/modernTheme";
import { moderateScale, moderateVerticalScale } from "../../src/utils/Responsive";

export default function AnalysisScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analysisData, setAnalysisData] = useState({
    todaySales: 0,
    todayReturn: 0,
    monthSales: 0,
    monthReturn: 0,
  });

  const fetchData = useCallback(async (isRefreshing = false) => {
    try {
      if (isRefreshing) setRefreshing(true);
      else setLoading(true);

      const storedUser = await AsyncStorage.getItem("user");
      if (!storedUser) {
        router.replace("/");
        return;
      }

      const parsedUser = JSON.parse(storedUser);
      const cleanId = String(parsedUser.clientId).trim().toUpperCase();
      const token = parsedUser.token;
      const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };

      const [sToday, sMonth, rDay, rMonth] = await Promise.all([
        fetch(`https://taskprime.app/api/salestoday-details/?client_id=${cleanId}`, { headers }).then(r => r.json()),
        fetch(`https://taskprime.app/api/salesmonthwise/?client_id=${cleanId}`, { headers }).then(r => r.json()),
        fetch(`https://taskprime.app/api/salesreturndaywise?client_id=${cleanId}`, { headers }).then(r => r.json()),
        fetch(`https://taskprime.app/api/salesreturnmonthwise?client_id=${cleanId}`, { headers }).then(r => r.json()),
      ]);

      setAnalysisData({
        todaySales: sToday?.grand_total || 0,
        todayReturn: rDay?.success ? (rDay.data?.[0]?.total_amount || 0) : 0,
        monthSales: sMonth?.success ? (sMonth.data?.[0]?.total_amount || 0) : 0,
        monthReturn: rMonth?.success ? (rMonth.data?.[0]?.total_amount || 0) : 0,
      });
    } catch (e) {
      console.warn("Failed to fetch analysis stats", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  return (
    <View style={styles.container}>
      <ModernHeader
        title="Sales & Return Analysis"
        leftIcon={<Ionicons name="arrow-back" size={moderateScale(26)} color={Colors.primary.main} />}
        onLeftPress={() => router.push("/(drawer)/(tabs)")}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={[Colors.primary.main]} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary.main} />
            <Text style={styles.loadingText}>Analyzing your data...</Text>
          </View>
        ) : (
          <View style={styles.cardsContainer}>
            {/* Header Description */}
            <View style={styles.pageHeader}>
              <Text style={styles.pageTitle}>Business Overview</Text>
              <Text style={styles.pageSubtitle}>Monitor your sales performance and returns trends.</Text>
            </View>

            {/* Today's Analysis Card */}
            <ModernCard style={styles.mainCard} elevated={true}>
              <LinearGradient
                colors={['#4F46E5', '#6366F1']}
                style={styles.cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="today" size={moderateScale(24)} color="#fff" />
                  </View>
                  <View>
                    <Text style={styles.cardLabel}>TIME PERIOD</Text>
                    <Text style={styles.cardMainTitle}>Today's Summary</Text>
                  </View>
                </View>

                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Total Sales</Text>
                    <Text style={styles.statValue}>₹{Math.floor(parseFloat(analysisData.todaySales)).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.verticalSeparator} />
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Total Return</Text>
                    <Text style={[styles.statValue, { color: '#FECACA' }]}>₹{Math.floor(parseFloat(analysisData.todayReturn)).toLocaleString('en-IN')}</Text>
                  </View>
                </View>

                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>Net Amount</Text>
                  <Text style={styles.balanceValue}>₹{Math.floor(parseFloat(analysisData.todaySales) - parseFloat(analysisData.todayReturn)).toLocaleString('en-IN')}</Text>
                </View>

                <View style={styles.cardFooter}>
                  <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.footerText}>Updated just now</Text>
                </View>
              </LinearGradient>
            </ModernCard>

            {/* Monthly Analysis Card */}
            <ModernCard style={styles.mainCard} elevated={true}>
              <LinearGradient
                colors={['#059669', '#10B981']}
                style={styles.cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Ionicons name="calendar-sharp" size={moderateScale(24)} color="#fff" />
                  </View>
                  <View>
                    <Text style={styles.cardLabel}>TIME PERIOD</Text>
                    <Text style={styles.cardMainTitle}>Monthly Summary</Text>
                  </View>
                </View>

                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Total Sales</Text>
                    <Text style={styles.statValue}>₹{Math.floor(parseFloat(analysisData.monthSales)).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.verticalSeparator} />
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Total Return</Text>
                    <Text style={[styles.statValue, { color: '#FECACA' }]}>₹{Math.floor(parseFloat(analysisData.monthReturn)).toLocaleString('en-IN')}</Text>
                  </View>
                </View>

                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>Net Amount</Text>
                  <Text style={styles.balanceValue}>₹{Math.floor(parseFloat(analysisData.monthSales) - parseFloat(analysisData.monthReturn)).toLocaleString('en-IN')}</Text>
                </View>

                <View style={styles.cardFooter}>
                  <Ionicons name="stats-chart" size={14} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.footerText}>Current month overall</Text>
                </View>
              </LinearGradient>
            </ModernCard>

            {/* Productivity Insight */}
            <View style={styles.insightBox}>
              <View style={styles.insightIcon}>
                <Ionicons name="bulb-outline" size={20} color={Colors.primary.main} />
              </View>
              <View style={styles.insightTextContainer}>
                <Text style={styles.insightTitle}>Pro Tip</Text>
                <Text style={styles.insightDescription}>
                  You can see the detailed breakdown for each day in the Sales and Return reports from the drawer menu.
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  content: {
    padding: moderateScale(Spacing.lg),
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: moderateVerticalScale(100),
  },
  loadingText: {
    marginTop: moderateVerticalScale(12),
    color: Colors.text.secondary,
    fontSize: moderateScale(14),
    fontWeight: '500',
  },
  pageHeader: {
    marginBottom: moderateVerticalScale(24),
  },
  pageTitle: {
    fontSize: moderateScale(24),
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: moderateScale(14),
    color: '#64748B',
    marginTop: moderateVerticalScale(4),
  },
  cardsContainer: {
    gap: moderateVerticalScale(20),
  },
  mainCard: {
    padding: 0,
    borderRadius: moderateScale(24),
    overflow: 'hidden',
    ...Shadows.md,
  },
  cardGradient: {
    padding: moderateScale(24),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(16),
    marginBottom: moderateVerticalScale(32),
  },
  iconCircle: {
    width: moderateScale(54),
    height: moderateScale(54),
    borderRadius: moderateScale(27),
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: moderateScale(10),
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  cardMainTitle: {
    color: '#fff',
    fontSize: moderateScale(20),
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: moderateScale(20),
    padding: moderateScale(20),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  verticalSeparator: {
    width: 1,
    height: moderateVerticalScale(40),
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: moderateScale(11),
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: moderateVerticalScale(6),
  },
  statValue: {
    color: '#fff',
    fontSize: moderateScale(18),
    fontWeight: '900',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
    marginTop: moderateVerticalScale(20),
    opacity: 0.8,
  },
  footerText: {
    color: '#fff',
    fontSize: moderateScale(10),
    fontWeight: '600',
  },
  insightBox: {
    flexDirection: 'row',
    backgroundColor: Colors.primary.main + '08',
    padding: moderateScale(16),
    borderRadius: moderateScale(16),
    borderWidth: 1,
    borderColor: Colors.primary.main + '15',
    alignItems: 'center',
    gap: moderateScale(12),
    marginTop: moderateVerticalScale(10),
  },
  insightIcon: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: Colors.primary.main + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightTextContainer: {
    flex: 1,
  },
  insightTitle: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: Colors.primary.main,
  },
  insightDescription: {
    fontSize: moderateScale(12),
    color: '#64748B',
    lineHeight: 18,
    marginTop: moderateVerticalScale(2),
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: moderateVerticalScale(16),
    paddingHorizontal: moderateScale(4),
    paddingTop: moderateVerticalScale(16),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: moderateScale(14),
    fontWeight: '700',
  },
  balanceValue: {
    color: '#fff',
    fontSize: moderateScale(18),
    fontWeight: '900',
  },
});
