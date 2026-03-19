import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { useLicenseModules } from "../../../src/utils/useLicenseModules";

export default function StockTab() {
    const router = useRouter();
    const { checkModule } = useLicenseModules();

    useFocusEffect(
        useCallback(() => {
            const go = async () => {
                const allowed = await checkModule("MOD030", "Stock Report", () => {
                    router.replace("/(drawer)/(tabs)");
                });
                if (allowed) router.replace("/(drawer)/stock-report");
            };
            go();
        }, [])
    );

    return null;
}
