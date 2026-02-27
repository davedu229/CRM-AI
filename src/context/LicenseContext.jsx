import { createContext, useContext, useState, useEffect } from 'react';
import { validateLicenseKey } from '../utils/license';

const LicenseContext = createContext(null);
const STORAGE_KEY = 'crm_pro_license';

export function LicenseProvider({ children }) {
    const [license, setLicense] = useState(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed && parsed.valid) return parsed;
            } catch {
                localStorage.removeItem(STORAGE_KEY);
            }
        }
        return null;
    });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Just for future hydration logic if needed, but not needed for local storage synchronous init
    }, []);

    const activateLicense = async (key) => {
        try {
            const result = await validateLicenseKey(key);
            const licenseData = { ...result, key, activatedAt: new Date().toISOString() };
            setLicense(licenseData);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(licenseData));
            return licenseData;
        } catch (err) {
            throw err;
        }
    };

    const deactivateLicense = () => {
        setLicense(null);
        localStorage.removeItem(STORAGE_KEY);
    };

    return (
        <LicenseContext.Provider value={{
            license,
            isLoading,
            isLocked: !isLoading && (!license || !license.valid),
            activateLicense,
            deactivateLicense
        }}>
            {children}
        </LicenseContext.Provider>
    );
}

export function useLicense() {
    const ctx = useContext(LicenseContext);
    if (!ctx) throw new Error('useLicense must be used within LicenseProvider');
    return ctx;
}
