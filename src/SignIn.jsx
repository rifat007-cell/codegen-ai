import React, { useEffect, useState } from "react";
import { useCart } from "./Contexts";
import { useNavigate, Link } from "@tanstack/react-router";

const SignIn = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false
    });

    const navigate = useNavigate()
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [toast, setToast] = useState(null);

    const { loginUser, setUser } = useCart()


    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        setIsSubmitting(true);

        try {
            // First, authenticate the user
            const data = await loginUser(formData.email, formData.password)
            console.log("after signin data:", data)

            if (data.user || data.success) {
                // Fetch the latest user data immediately after successful login
                const meDataRes = await fetch("/api/users/me", {
                    credentials: "include",
                })

                if (meDataRes.ok) {
                    const meData = await meDataRes.json()
                    console.log("User data from /me:", meData)

                    // Update the user context with the fresh data
                    if (meData.user && meData.user.activated) {
                        setUser(meData.user)
                        setToast({ message: "✅ Successfully logged in!", type: "success" });

                        // Navigate after a short delay to show success message
                        setTimeout(() => {
                            navigate({ to: '/' })
                        }, 1000);
                    }
                    else if (!meData.user.activated) {

                        setToast({ message: "⚠️ Activate Your email first before login", type: "error" });
                    }

                    else {
                        throw new Error("User data not found in response")
                    }
                } else {
                    throw new Error("Failed to fetch user data")
                }
            } else if (data.error) {
                const errorMessage = typeof data.error === 'string'
                    ? data.error
                    : data.error.email || "Login failed"
                setToast({ message: `⚠️ ${errorMessage}`, type: "error" });
            } else {
                setToast({ message: "⚠️ Login failed", type: "error" });
            }
        } catch (err) {
            console.error("Login error:", err)
            setToast({ message: "❌ Something went wrong!", type: "error" });
        } finally {
            setIsSubmitting(false);
            // Clear toast after 3 seconds
            setTimeout(() => setToast(null), 3000);
        }
    }

    const handleForgotPassword = (e) => {
        e.preventDefault()
        navigate({ to: '/user/forgot-password' });
    };

    const toastStyles = {
        success: { background: "#4CAF50" },
        error: { background: "#F44336" },
        info: { background: "#2196F3" },
    };

    return (
        <div className="user-register">

            {toast && (
                <div style={{
                    position: "fixed",
                    top: "20px",
                    right: "20px",
                    color: "#fff",
                    padding: "10px 20px",
                    borderRadius: "6px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                    zIndex: 1000,
                    ...toastStyles[toast.type || "info"]
                }}>
                    {toast.message}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="form-container">
                    <div className="generator-form">
                        <div className="register-header">
                            <h1 className="register-title">Welcome Back</h1>
                            <p className="register-subtitle">Sign in to your Maker account</p>
                        </div>

                        <div className="form-grid">
                            {/* Email Field */}
                            <div className="form-group">
                                <label htmlFor="email" className="form-label">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="example@email.com"
                                    name="email"
                                    id="email"
                                    className="form-input"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    autoComplete="email"
                                />
                                {errors.email && (
                                    <div className="form-error">
                                        ⚠️ {errors.email}
                                    </div>
                                )}
                            </div>

                            {/* Password Field */}
                            <div className="form-group">
                                <div className="password-label-container">
                                    <label htmlFor="password" className="form-label">Password</label>

                                    <Link to="/user/forgot-password" className="forgot-password-link">
                                        Forgot Password?
                                    </Link>
                                </div>
                                <div className="password-input-container">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        id="password"
                                        className="form-input password-input"
                                        placeholder="Enter your password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? "👁️" : "👁️‍🗨️"}
                                    </button>
                                </div>
                                {errors.password && (
                                    <div className="form-error">
                                        ⚠️ {errors.password}
                                    </div>
                                )}
                            </div>

                            {/* Submit Button */}
                            <div className="form-actions">
                                <button
                                    type="submit"
                                    className="generate-btn"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Signing In...' : 'Sign In'}
                                </button>
                            </div>
                        </div>

                        {/* Auth Links */}
                        <div className="auth-links">
                            <p>Don't have an account? <Link to="/register" className="auth-link">Create Account</Link></p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default SignIn;
