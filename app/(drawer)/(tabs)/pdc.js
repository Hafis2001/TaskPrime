import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { useLicenseModules } from "../../../src/utils/useLicenseModules";

export default function PdcTab() {
    const router = useRouter();
    const { checkModule } = useLicenseModules();

    useFocusEffect(
        useCallback(() => {
            const go = async () => {
                const allowed = await checkModule("MOD032", "PDC", () => {
                    router.replace("/(drawer)/(tabs)");
                });
                if (allowed) router.replace("/(drawer)/pdc-report");
            };
            go();
        }, [])
    );

    return null;
}
