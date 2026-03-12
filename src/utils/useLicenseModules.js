/**
 * useLicenseModules
 *
 * Fetches the purchased module list from the license API and caches it in
 * AsyncStorage.  Re-polls every 5 minutes while the hook is mounted.
 *
 * Usage:
 *   const { hasModule } = useLicenseModules();
 *   if (!hasModule("MOD020")) { Alert … }
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

const LICENSE_API =
    "https://activate.imcbs.com/mobileapp/api/project/taskprime/";
const CACHE_KEY = "licensedModules";
const DEMO_CACHE_KEY = "demoLicenseInfo";
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Global memory cache to prevent storage/network delays after first load
let globalModuleCodes = null;
let globalDemoInfo = null;
let isFetching = false;
let fetchPromise = null;

// Listeners for global state updates
const stateListeners = new Set();
const notifyListeners = () => {
    stateListeners.forEach((listener) => {
        listener({
            moduleCodes: globalModuleCodes || [],
            demoInfo: globalDemoInfo
        });
    });
};

export function useLicenseModules() {
    const [state, setState] = useState({
        moduleCodes: globalModuleCodes || [],
        demoInfo: globalDemoInfo
    });
    const intervalRef = useRef(null);

    // Register listener on mount
    useEffect(() => {
        const listener = (newState) => setState(newState);
        stateListeners.add(listener);
        return () => stateListeners.delete(listener);
    }, []);

    const fetchModules = async (force = false) => {
        if (isFetching && !force) return fetchPromise;
        isFetching = true;

        fetchPromise = (async () => {
            try {
                const licenseKey = await AsyncStorage.getItem("licenseKey");
                const deviceId = await AsyncStorage.getItem("deviceId");

                if (!licenseKey || !deviceId) {
                    isFetching = false;
                    return globalModuleCodes || [];
                }

                // Add a shorter timeout to the fetch to avoid long blocks
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000);

                const fetchUrl = `${LICENSE_API}?license_key=${licenseKey}&device_id=${deviceId}`;
                console.log("🌐 Fetching License Modules from:", fetchUrl);

                const res = await fetch(
                    fetchUrl,
                    {
                        headers: { Accept: "application/json" },
                        signal: controller.signal
                    }
                );
                clearTimeout(timeoutId);

                if (!res.ok) {
                    const errorBody = await res.text();
                    console.error(`❌ API Error (${res.status}):`, errorBody);
                    throw new Error(`API error: ${res.status}`);
                }

                const json = await res.json();
                console.log("📦 Full License Response:", JSON.stringify(json).substring(0, 500));

                let modules = json.modules || (json.data && json.data.modules) || null;

                // Handle the case where the API returns a list of customers (as seen in LoginScreen)
                if (!modules && json.customers && Array.isArray(json.customers)) {
                    const clientId = await AsyncStorage.getItem("clientId");
                    const normalizedClientId = (clientId || "").trim().toUpperCase();

                    const matchedCustomer = json.customers.find(
                        (c) => (c?.client_id ?? "").toString().trim().toUpperCase() === normalizedClientId
                    );

                    if (matchedCustomer) {
                        modules = matchedCustomer.modules || [];
                        console.log(`✅ Found modules for Client ID ${normalizedClientId}`);
                    }
                }

                const actualModules = modules || [];
                const codes = actualModules.map((m) => String(m.module_code).toUpperCase());

                // --- Demo License Parsing ---
                let foundDemo = null;
                const clientId = await AsyncStorage.getItem("clientId");
                const normalizedClientId = (clientId || "").trim().toUpperCase();
                const normalizedLicenseKey = (licenseKey || "").trim().toUpperCase();

                if (json.demo_licenses && Array.isArray(json.demo_licenses)) {
                    foundDemo = json.demo_licenses.find((d) => {
                        const projectClientId = (d?.client_id ?? "").toString().trim().toUpperCase();
                        const projectDemoKey = (d?.demo_license ?? "").toString().trim().toUpperCase();
                        return projectClientId === normalizedClientId && projectDemoKey === normalizedLicenseKey;
                    });
                }

                console.log("📜 License Modules Loaded:", codes);
                if (foundDemo) console.log("🧪 Demo License Active:", foundDemo.expires_at);

                globalModuleCodes = codes;
                globalDemoInfo = foundDemo;
                notifyListeners();

                await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(codes));
                if (foundDemo) {
                    await AsyncStorage.setItem(DEMO_CACHE_KEY, JSON.stringify(foundDemo));
                } else {
                    await AsyncStorage.removeItem(DEMO_CACHE_KEY);
                }

                return codes;
            } catch (err) {
                console.warn("⚠️ License fetch failed:", err);
                // Fallback to storage on failure
                try {
                    const cached = await AsyncStorage.getItem(CACHE_KEY);
                    if (cached) {
                        const parsed = JSON.parse(cached).map(c => String(c).toUpperCase());
                        console.log("📦 Loaded Modules from Cache:", parsed);
                        globalModuleCodes = parsed;
                        setModuleCodes(parsed);
                        return parsed;
                    }
                } catch (_) { }

                // DO NOT set globalModuleCodes to [] here if it was null, 
                // so that hasModule knows we are still in an "unknown" state.
                return globalModuleCodes;
            } finally {
                isFetching = false;
                fetchPromise = null;
            }
        })();

        return fetchPromise;
    };

    useEffect(() => {
        const init = async () => {
            // 1. Try memory
            if (globalModuleCodes !== null) {
                // Background refresh if memory is empty (first load should still fetch)
                if (globalModuleCodes.length === 0) fetchModules();
                return;
            }

            // 2. Try storage
            try {
                const [cachedModules, cachedDemo] = await Promise.all([
                    AsyncStorage.getItem(CACHE_KEY),
                    AsyncStorage.getItem(DEMO_CACHE_KEY)
                ]);

                if (cachedModules) {
                    globalModuleCodes = JSON.parse(cachedModules);
                }
                if (cachedDemo) {
                    globalDemoInfo = JSON.parse(cachedDemo);
                }
                notifyListeners();
            } catch (_) { }

            // 3. Always background refresh
            fetchModules();
        };

        init();
        intervalRef.current = setInterval(fetchModules, POLL_INTERVAL_MS);
        return () => clearInterval(intervalRef.current);
    }, []);

    /**
     * Returns true if the module code is in the purchased list.
     * Uses memory cache if available for instant result.
     */
    const hasModule = async (code) => {
        const normalizedCode = String(code).toUpperCase();

        // 0. If demo license is active and NOT expired, allow all modules
        if (globalDemoInfo) {
            const expiry = new Date(globalDemoInfo.expires_at);
            const now = new Date();
            if (now <= expiry) {
                console.log(`🧪 [hasModule] Demo Active & Valid: Allowing access to ${normalizedCode}`);
                return true;
            } else {
                console.log(`🧪 [hasModule] Demo EXPIRED: Restricting access to ${normalizedCode}`);
            }
        }

        // 1. If we have definitive data in memory, return immediately
        if (globalModuleCodes !== null) {
            const has = globalModuleCodes.includes(normalizedCode);
            console.log(`🔍 [hasModule] Check: ${normalizedCode} -> ${has} (from memory: ${globalModuleCodes.join(",")})`);
            return has;
        }

        // 2. We don't have data yet. Wait for current fetch or start a new one.
        let attempts = 0;
        while (globalModuleCodes === null && attempts < 3) {
            console.log(`⌛ [hasModule] Waiting for data (attempt ${attempts + 1}/3)...`);
            await (fetchPromise || fetchModules());
            if (globalModuleCodes !== null) break;
            await new Promise(r => setTimeout(r, 800));
            attempts++;
        }

        if (globalModuleCodes === null) {
            console.warn(`❌ [hasModule] Timeout! Defaulting to FALSE for ${normalizedCode}`);
            return false;
        }

        const hasFinal = globalModuleCodes.includes(normalizedCode);
        console.log(`✅ [hasModule] Final Result: ${normalizedCode} -> ${hasFinal} (codes: ${globalModuleCodes.join(",")})`);
        return hasFinal;
    };

    const checkModule = async (code, moduleName, onDenied) => {
        const allowed = await hasModule(code);
        if (allowed) return true;

        console.log(`🚫 Access Denied for ${moduleName} (${code}).`);

        // IMPORTANT: Navigate away FIRST so the Drawer properly unfocuses this screen.
        // This ensures useFocusEffect fires correctly on the next press.
        // Then show the alert on top of the destination screen.
        if (onDenied) {
            onDenied();
        }

        // Show alert after a short delay to let the navigation animation complete
        setTimeout(() => {
            Alert.alert(
                "Module Not Purchased",
                `You have not purchased the "${moduleName}" module yet. Please contact your administrator to activate it.`,
                [{ text: "OK" }],
                { cancelable: false }
            );
        }, 400);

        return false;
    };

    return {
        hasModule,
        checkModule,
        refreshModules: () => fetchModules(true),
        moduleCodes: state.moduleCodes,
        demoInfo: state.demoInfo
    };
}
