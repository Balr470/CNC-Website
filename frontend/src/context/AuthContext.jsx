import React, { createContext, useState, useEffect, useCallback } from 'react';
import * as authService from '../services/auth.service';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch fresh user data from API (includes updated purchasedDesigns)
    const refreshUser = useCallback(async () => {
        try {
            const data = await authService.getMe();
            const freshUser = data.data.user;
            setUser(freshUser);
            localStorage.setItem('user', JSON.stringify(freshUser));
        } catch (error) {
            // Fix #6: only wipe session on explicit 401 (bad/expired token)
            // Network timeouts or 5xx errors should NOT log the user out
            if (error.status === 401) {
                authService.logout();
                setUser(null);
            }
            // Otherwise: silently keep the existing user state — they'll be challenged again on the next protected API call
        }
    }, []);

    // On app boot: if token exists, verify it and get fresh user data
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            refreshUser().finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [refreshUser]);

    const login = async (email, password) => {
        try {
            const data = await authService.login(email, password);
            setUser(data.data.user);
            return data;
        } catch (error) {
            // Normalize error message from axios response
            const message = error.response?.data?.error || error.message || 'Login failed';
            throw new Error(message);
        }
    };

    const register = async (name, email, password) => {
        try {
            const data = await authService.register(name, email, password);
            setUser(data.data.user);
            return data;
        } catch (error) {
            const message = error.response?.data?.error || error.message || 'Registration failed';
            throw new Error(message);
        }
    };

    const logout = () => {
        authService.logout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
            {loading ? (
                <div className="min-h-screen bg-[#f8f9fc] flex flex-col items-center justify-center font-sans selection:bg-black selection:text-white">
                    <div className="w-14 h-14 bg-[#111] rounded-2xl flex items-center justify-center text-white font-black text-lg tracking-tighter shadow-xl animate-pulse mb-6">
                        CNC
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-gray-200 border-t-[#111] rounded-full animate-spin"></div>
                        <span className="text-gray-500 font-bold text-sm tracking-wide">AUTHENTICATING</span>
                    </div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};
