import { Outlet, Navigate } from "@tanstack/react-router";
import { useCart } from "./contexts";

export default function ProtectedRoute() {
    const { user, isLoading } = useCart();

    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '50vh',
                fontSize: '18px',
                color: '#666'
            }}>
                Loading...
            </div>
        );
    }

    const isAuthenticated = user && user.activated && user.name && user.email;

    if (!isAuthenticated) {
        return <Navigate to="/sign-in" replace />;
    }

    return <Outlet />;
}
