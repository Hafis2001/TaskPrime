import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { useLicenseModules } from "../../../src/utils/useLicenseModules";

export default function CashTab() {
    const router = useRouter();
    const { hasModule, checkModule } = useLicenseModules();

    useFocusEffect(
        useCallback(() => {
            const go = async () => {
                const hasBank = await hasModule("MOD020");
                const hasCash = await hasModule("MOD019");
                if (!hasBank && !hasCash) {
                    await checkModule("MOD019", "Bank & Cash");
                    router.replace("/(drawer)/(tabs)");
                    return;
                }
                router.replace("/(drawer)/bank-cash");
            };
            go();
        }, [])
    );

    return null;
}
