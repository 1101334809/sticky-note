/**
 * 认证上下文
 * 
 * 单层 SSO 鉴权：用户信息从后端 API 获取，登出跳转 SSO 网关
 */
import { createContext, useContext, useCallback, useState, useEffect, type ReactNode } from 'react';
import { api } from '@/services/api';
import type { UserInfo } from '@/types';

interface AuthContextType {
    user: UserInfo | null;
    loading: boolean;
    isAuthenticated: boolean;
    refreshUser: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            const response = await api.get<UserInfo>('/auth/me');
            setUser(response.data);
        } catch (error) {
            console.error('获取用户信息失败:', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        // 设置登出标记，阻止后续 API 请求
        sessionStorage.setItem('__sso_force_logout__', '1');

        // 清除用户状态
        setUser(null);

        // 跳转到 SSO 登出
        window.location.replace(`${window.location.origin}/token/logout`);
    }, []);

    useEffect(() => {
        // 初始化时获取用户信息
        refreshUser();
    }, [refreshUser]);

    const value: AuthContextType = {
        user,
        loading,
        isAuthenticated: !!user,
        refreshUser,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
