import React, { useState } from "react";

import { Link, useNavigate } from "@tanstack/react-router";

const User = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState(null);

    const navigate = useNavigate()

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const formDataObj = new FormData(e.target);
        const name = formDataObj.get("name");
        const email = formDataObj.get("email");
        const password = formDataObj.get("password");

        setIsSubmitting(true);

        async function postUserData() {
            const response = await fetch("/api/users", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name, email, password }),
            });

            if (!response.ok) {
                throw new Error("Network response was not ok");
            }

            return response.json();
        }

        try {
            const data = await postUserData();
            console.log(data);

            if (data.user) {
                setToast({ message: "✅ Account created successfully and please verify your email before login!", type: "success" });
                setTimeout(() => {
                    navigate({ to: '/sign-in' })
                }, 1000);


            } else {
                setToast({ message: `⚠️ ${data.error.email}`, type: "error" });
            }
        } catch (err) {
            console.error(err);
            setToast({ message: "❌ Something went wrong!", type: "error" });
        } finally {
            setTimeout(() => setToast(null), 2000);
            setIsSubmitting(false);
        }
    };

    const toastStyles = {
        success: { background: "#4CAF50" },
        error: { background: "#F44336" },
        info: { background: "#2196F3" },
    };

    return (
        <div className="user-register">
            {/* ✅ Toast Container */}
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
                            <h1 className="register-title">Create Account</h1>
                            <p className="register-subtitle">Join Maker - AI For Everyone</p>
                        </div>

                        <div className="form-grid">
                            {/* Name Field */}
                            <div className="form-group">
                                <label htmlFor="name" className="form-label">Full Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    id="name"
                                    className="form-input"
                                    placeholder="Enter your full name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                />
                                {errors.name && (
                                    <div className="form-error">⚠️ {errors.name}</div>
                                )}
                            </div>

                            {/* Email Field */}
                            <div className="form-group">
                                <label htmlFor="email" className="form-label">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    id="email"
                                    className="form-input"
                                    placeholder="example@email.com"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                />
                                {errors.email && (
                                    <div className="form-error">⚠️ {errors.email}</div>
                                )}
                            </div>

                            {/* Password Field */}
                            <div className="form-group">
                                <label htmlFor="password" className="form-label">Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    id="password"
                                    className="form-input"
                                    placeholder="Enter a secure password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                />
                                {errors.password && (
                                    <div className="form-error">⚠️ {errors.password}</div>
                                )}
                            </div>

                            {/* Submit Button */}
                            <div className="form-actions">
                                <button
                                    type="submit"
                                    className="generate-btn"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Creating Account...' : 'Create Account'}
                                </button>
                            </div>
                        </div>

                        {/* Auth Links */}
                        <div className="auth-links">
                            <p>Already have an account? <Link to="/sign-in" className="auth-link">Sign In</Link></p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default User;

