import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useCart } from "./Contexts";

export default function Layout() {
    const { user, isLoading, logoutUser } = useCart()
    const location = useLocation()
    const navigate = useNavigate()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    console.log("I am inside layout", { user, isLoading })

    // Helper function to check if user is authenticated
    const isUserAuthenticated = () => {
        return user && user.activated && user.name && user.email;
    }

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                setIsMobileMenuOpen(false);
            }
        };

        const handleClickOutside = (e) => {
            if (isMobileMenuOpen && !e.target.closest('.nav-container')) {
                setIsMobileMenuOpen(false);
            }
        };

        if (isMobileMenuOpen) {
            document.addEventListener('keydown', handleEscape);
            document.addEventListener('click', handleClickOutside);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.removeEventListener('click', handleClickOutside);
        };
    }, [isMobileMenuOpen]);

    const handleLogout = async (e) => {
        e.preventDefault()
        await logoutUser();
        navigate({ to: "/" });
    }

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(prev => !prev);
    }

    // Helper function to check if route is active
    const isActiveRoute = (path) => {
        console.log(location.pathname)
        return location.pathname === path;
    }

    const getNavLinkClass = (path, linkType = null) => {
        if (location.pathname === '/sign-in' && linkType === 'generate-redirect') {
            return 'nav-link';
        }

        return `nav-link ${isActiveRoute(path) ? 'nav-link-active' : ''}`;
    }

    if (isLoading) {
        return (
            <div className="app-layout">
                <nav className="nav">
                    <div className="nav-container">
                        <div className="nav-brand">
                            <Link to="/" className="nav-logo">🚀 Codegen AI</Link>
                        </div>
                        <div className="nav-links">
                            <div style={{ padding: '10px', color: '#666' }}>Loading...</div>
                        </div>
                    </div>
                </nav>
                <main className="main-content">
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
                </main>
            </div>
        );
    }

    return (
        <div className="app-layout">
            <nav className="nav">
                <div className="nav-container">
                    <div className="nav-brand">
                        <Link to="/" className="nav-logo">🚀 Codegen AI</Link>
                    </div>
                    <button
                        className="nav-toggle"
                        id="nav-toggle"
                        onClick={toggleMobileMenu}
                        aria-label="Toggle mobile menu"
                        aria-expanded={isMobileMenuOpen}
                    >
                        {isMobileMenuOpen ? '✕' : '☰'}
                    </button>
                    <div className={`nav-links ${isMobileMenuOpen ? 'open' : ''}`}>
                        <Link
                            to="/"
                            className={getNavLinkClass('/')}
                        >
                            Home
                        </Link>

                        {isUserAuthenticated() ? (
                            <Link
                                to="/generate-code"
                                className={getNavLinkClass('/generate-code')}
                            >
                                Generate
                            </Link>
                        ) : (
                            <Link
                                to="/sign-in"
                                className={getNavLinkClass('/sign-in', 'generate-redirect')}
                            >
                                Generate
                            </Link>
                        )}

                        <Link
                            to="/about"
                            className={getNavLinkClass('/about')}
                        >
                            About
                        </Link>

                        {isUserAuthenticated() ? (
                            <>
                                <span className="nav-link user-greeting">
                                    Hello, {user.name}
                                </span>
                                <button
                                    onClick={(e) => handleLogout(e)}
                                    className="nav-link logout-btn"
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'inherit',
                                        fontSize: 'inherit',
                                        textDecoration: 'none'
                                    }}
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/register"
                                    className={getNavLinkClass('/register')}
                                >
                                    Register
                                </Link>
                                <Link
                                    to="/sign-in"
                                    className={getNavLinkClass('/sign-in')}
                                >
                                    Sign In
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
