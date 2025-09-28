import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [toast, setToast] = useState(null);

    const navigate = useNavigate();

    const handleInputChange = (e) => {
        setEmail(e.target.value);

        // Clear error when user starts typing
        if (errors.email) {
            setErrors(prev => ({
                ...prev,
                email: ''
            }));
        }
    };

    const validateEmail = () => {
        const newErrors = {};

        if (!email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateEmail()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/tokens/password-reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setIsSuccess(true);
                setToast({ message: "✅ Password reset email sent successfully!", type: "success" });
            } else {
                const errorMessage = data.error || 'Failed to send reset email';
                setToast({ message: `⚠️ ${errorMessage}`, type: "error" });
            }
        } catch (error) {
            console.error('Password reset error:', error);
            setToast({ message: "❌ Something went wrong! Please try again.", type: "error" });
        } finally {
            setIsSubmitting(false);
            // Clear toast after 5 seconds
            setTimeout(() => setToast(null), 5000);
        }
    };

    const handleBackToSignIn = () => {
        navigate({ to: '/sign-in' });
    };

    const toastStyles = {
        success: { background: "#4CAF50" },
        error: { background: "#F44336" },
        info: { background: "#2196F3" },
    };

    if (isSuccess) {
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

                <div className="form-container">
                    <div className="generator-form">
                        <div className="register-header">
                            <div className="success-icon">
                                ✉️
                            </div>
                            <h1 className="register-title">Check Your Email</h1>
                            <p className="register-subtitle">
                                We've sent a password reset link to <strong>{email}</strong>
                            </p>
                        </div>

                        <div className="form-grid">
                            <div className="success-message">
                                <p>
                                    Click the link in your email to reset your password.
                                    The link will expire in 45 minutes for security reasons.
                                </p>
                                <p>
                                    Didn't receive the email? Check your spam folder or try again.
                                </p>
                            </div>

                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="generate-btn"
                                    onClick={handleBackToSignIn}
                                >
                                    Back to Sign In
                                </button>
                            </div>

                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="secondary-btn"
                                    onClick={() => {
                                        setIsSuccess(false);
                                        setEmail('');
                                    }}
                                >
                                    Try Different Email
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

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
                            <h1 className="register-title">Forgot Password?</h1>
                            <p className="register-subtitle">
                                Enter your email address and we'll send you a link to reset your password
                            </p>
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
                                    value={email}
                                    onChange={handleInputChange}
                                    autoComplete="email"
                                    autoFocus
                                />
                                {errors.email && (
                                    <div className="form-error">
                                        ⚠️ {errors.email}
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
                                    {isSubmitting ? 'Sending Email...' : 'Send Reset Link'}
                                </button>
                            </div>

                            {/* Back to Sign In */}
                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="secondary-btn"
                                    onClick={handleBackToSignIn}
                                >
                                    Back to Sign In
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default ForgotPassword;
