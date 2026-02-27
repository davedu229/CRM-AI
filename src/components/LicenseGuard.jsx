import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useLicense } from '../context/LicenseContext';

export default function LicenseGuard() {
    const { isLocked, isLoading } = useLicense();
    const location = useLocation();

    // If still reading from localStorage, show nothing or a spinner
    if (isLoading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-body)' }}>
                <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }}></span>
            </div>
        );
    }

    // If locked and trying to access a protected page, redirect to unlock
    if (isLocked) {
        return <Navigate to="/unlock" state={{ from: location }} replace />;
    }

    // Otherwise, render the protected routes
    return <Outlet />;
}
