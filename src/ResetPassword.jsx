import React, { useState } from 'react';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Extract token from URL parameters
    const getTokenFromUrl = () => {
        const params = new URLSearchParams(window.location.search);
        return params.get('token');
    };

    const validatePasswords = () => {
        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return false;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        setError('');
        setMessage('');

        if (!validatePasswords()) {
            return;
        }

        const token = getTokenFromUrl();
        if (!token) {
            setError('Invalid reset token. Please request a new password reset.');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/users/password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token,
                    password,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage('Password reset successfully! You can now log in with your new password.');
                setPassword('');
                setConfirmPassword('');
            } else {
                setError(data.message || 'Failed to reset password. Please try again.');
            }
        } catch (err) {
            setError('Network error. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#0a0a0a',
            color: '#eaeaea',
            fontFamily: '"Fira Code", monospace',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '4rem 1rem'
        }}>
            <div style={{
                maxWidth: '400px',
                margin: '0 auto',
                width: '100%'
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2 style={{
                        fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                        fontWeight: 'bold',
                        color: '#00ffe7',
                        textShadow: '0 0 10px rgba(0, 255, 231, 0.7)',
                        marginBottom: '0.5rem',
                        margin: '0 0 0.5rem 0'
                    }}>
                        Reset Password
                    </h2>
                    <p style={{
                        fontSize: '1rem',
                        color: '#bbb',
                        margin: '0'
                    }}>
                        Enter your new password below
                    </p>
                </div>

                {/* Form Container */}
                <div style={{
                    background: '#111',
                    border: '1px solid #222',
                    borderRadius: '12px',
                    padding: '2rem',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)'
                }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#00ffe7';
                        e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 231, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#222';
                        e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
                    }}>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* New Password Field */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                color: '#00ffe7',
                                marginBottom: '0.5rem'
                            }}>
                                New Password
                            </label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    style={{
                                        background: '#0d0d0d',
                                        border: '1px solid #333',
                                        borderRadius: '6px',
                                        padding: '0.75rem',
                                        paddingRight: '2.5rem',
                                        color: '#eaeaea',
                                        fontFamily: '"Fira Code", monospace',
                                        fontSize: '0.9rem',
                                        width: '100%',
                                        outline: 'none',
                                        transition: 'all 0.3s ease'
                                    }}
                                    placeholder="Enter new password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#00ffe7';
                                        e.target.style.boxShadow = '0 0 8px rgba(0, 255, 231, 0.4)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#333';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                                <button
                                    type="button"
                                    style={{
                                        position: 'absolute',
                                        right: '0.75rem',
                                        background: 'none',
                                        border: 'none',
                                        color: '#bbb',
                                        fontSize: '1.2rem',
                                        cursor: 'pointer',
                                        transition: 'color 0.3s ease',
                                        padding: '0'
                                    }}
                                    onClick={() => setShowPassword(!showPassword)}
                                    onMouseEnter={(e) => e.target.style.color = '#00ffe7'}
                                    onMouseLeave={(e) => e.target.style.color = '#bbb'}
                                >
                                    {showPassword ? '👁️' : '🙈'}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password Field */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                color: '#00ffe7',
                                marginBottom: '0.5rem'
                            }}>
                                Confirm New Password
                            </label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                style={{
                                    background: '#0d0d0d',
                                    border: '1px solid #333',
                                    borderRadius: '6px',
                                    padding: '0.75rem',
                                    color: '#eaeaea',
                                    fontFamily: '"Fira Code", monospace',
                                    fontSize: '0.9rem',
                                    width: '100%',
                                    outline: 'none',
                                    transition: 'all 0.3s ease'
                                }}
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#00ffe7';
                                    e.target.style.boxShadow = '0 0 8px rgba(0, 255, 231, 0.4)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#333';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div style={{
                                background: '#2a1f1f',
                                border: '1px solid #ff4d4f',
                                borderRadius: '6px',
                                padding: '1rem',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.75rem'
                            }}>
                                <div style={{ color: '#ff4d4f', fontSize: '1.2rem', flexShrink: 0 }}>
                                    ⚠️
                                </div>
                                <div style={{
                                    fontSize: '0.85rem',
                                    color: '#ff4d4f',
                                    fontWeight: '500'
                                }}>
                                    {error}
                                </div>
                            </div>
                        )}

                        {/* Success Message */}
                        {message && (
                            <div style={{
                                background: '#1f2a1f',
                                border: '1px solid #73d13d',
                                borderRadius: '6px',
                                padding: '1rem',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.75rem'
                            }}>
                                <div style={{ color: '#73d13d', fontSize: '1.2rem', flexShrink: 0 }}>
                                    ✅
                                </div>
                                <div style={{
                                    fontSize: '0.85rem',
                                    color: '#73d13d',
                                    fontWeight: '500'
                                }}>
                                    {message}
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={handleSubmit}
                            style={{
                                padding: '0.9rem 2rem',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                color: isLoading ? '#777' : '#0a0a0a',
                                background: isLoading ? '#333' : '#00ffe7',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.3s ease',
                                fontFamily: '"Fira Code", monospace',
                                width: '100%',
                                transform: 'translateY(0)',
                                boxShadow: 'none'
                            }}
                            onMouseEnter={(e) => {
                                if (!isLoading) {
                                    e.target.style.background = '#00ccb5';
                                    e.target.style.transform = 'translateY(-3px)';
                                    e.target.style.boxShadow = '0 0 15px rgba(0, 255, 231, 0.6)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isLoading) {
                                    e.target.style.background = '#00ffe7';
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = 'none';
                                }
                            }}
                        >
                            {isLoading ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    <div style={{
                                        width: '16px',
                                        height: '16px',
                                        border: '2px solid #777',
                                        borderTop: '2px solid transparent',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite'
                                    }} />
                                    Resetting...
                                </div>
                            ) : (
                                'Reset Password'
                            )}
                        </button>
                    </div>
                </div>

                {/* Footer Links */}
                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <a
                        href="/signin"
                        style={{
                            color: '#00ffe7',
                            textDecoration: 'underline',
                            fontSize: '0.9rem',
                            transition: 'color 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.color = '#00ccb5'}
                        onMouseLeave={(e) => e.target.style.color = '#00ffe7'}
                    >
                        Back to Sign In
                    </a>
                </div>
            </div>

            {/* Add keyframe animation for loading spinner */}
            <style>
                {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
            </style>
        </div>
    );
};

export default ResetPassword;
