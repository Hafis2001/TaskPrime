import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useLicenseModules } from "../../../src/utils/useLicenseModules";

export default function EventsTab() {
    const router = useRouter();
    const { checkModule } = useLicenseModules();

    useEffect(() => {
        const go = async () => {
            const allowed = await checkModule("MOD031", "Event Log", () => {
                router.replace("/(drawer)/(tabs)");
            });
            if (allowed) router.replace("/(drawer)/event-log");
        };
        go();
    }, []);

    return null;
}
