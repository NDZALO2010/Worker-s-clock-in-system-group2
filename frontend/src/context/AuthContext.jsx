import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { readSession, writeSession } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [session, setSession] = useState(() => readSession());

    const login = useCallback((token, employee) => {
        const nextSession = { token, employee };
        writeSession(nextSession);
        setSession(nextSession);
    }, []);

    const logout = useCallback(() => {
        writeSession(null);
        setSession(null);
    }, []);

    const hasRole = useCallback(
        (...roles) => !!session?.employee?.role && roles.includes(session.employee.role),
        [session],
    );

    const value = useMemo(
        () => ({
            token: session?.token ?? null,
            employee: session?.employee ?? null,
            isAuthenticated: !!session?.token,
            login,
            logout,
            hasRole,
        }),
        [session, login, logout, hasRole],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
