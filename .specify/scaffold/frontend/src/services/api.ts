/**
 * API 请求封装
 * Axios 实例配置与拦截器
 * 
 * 单层 SSO 鉴权：依赖 SSO 网关的 satoken Cookie，无需本地 Token
 */
import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { message } from 'antd';
import type { ApiResponse } from '@/types';

/** API 基础路径 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

/** 请求超时时间 */
const REQUEST_TIMEOUT = 30000;

/** 全局 AbortController，用于登出时取消所有请求 */
let globalAbortController: AbortController | null = null;

/**
 * 取消所有进行中的请求（登出时调用）
 */
export function cancelAllRequests(): void {
    if (globalAbortController) {
        globalAbortController.abort();
        globalAbortController = null;
    }
}

/**
 * 检查是否正在登出
 */
function isLoggingOut(): boolean {
    return sessionStorage.getItem('__sso_force_logout__') === '1';
}

/** 错误码消息映射 */
const ERROR_MESSAGES: Record<number, string> = {
    1001: '未登录或登录已过期，请重新登录',
    1002: '没有操作权限',
    1003: 'Token 已过期，请重新登录',
    2001: '参数验证失败',
    3001: '业务处理失败',
    5001: '系统繁忙，请稍后重试',
};

/**
 * 创建 Axios 实例
 */
const axiosInstance: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: REQUEST_TIMEOUT,
    withCredentials: true, // 跨域请求携带 Cookie（SSO satoken）
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * 请求拦截器
 */
axiosInstance.interceptors.request.use(
    config => {
        // 检查是否正在登出，如果是则阻止所有请求
        if (isLoggingOut()) {
            console.log('[api.ts] 检测到登出标记，阻止请求:', config.url);
            const error = new Error('User is logging out');
            (error as any).isLogoutError = true;
            return Promise.reject(error);
        }

        // 为每个请求添加 AbortController signal
        if (!globalAbortController) {
            globalAbortController = new AbortController();
        }
        config.signal = globalAbortController.signal;

        // 如果是 FormData，删除 Content-Type 让浏览器自动设置
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        return config;
    },
    error => {
        console.error('Request error:', error);
        return Promise.reject(error);
    }
);

/**
 * 响应拦截器
 */
axiosInstance.interceptors.response.use(
    (response: AxiosResponse<ApiResponse>) => {
        const { data } = response;

        // 如果响应是二进制流 (blob)，直接返回
        if (response.config.responseType === 'blob' || data instanceof Blob) {
            return response;
        }

        // 业务成功
        if (data.code === 0) {
            return response;
        }

        // 业务错误处理
        const errorMsg = ERROR_MESSAGES[data.code] || data.message || '请求失败';

        // 【单层 SSO】Token 过期或未登录，跳转 SSO 登出
        if (data.code === 1001 || data.code === 1003) {
            message.error(errorMsg);
            setTimeout(() => {
                window.location.replace(`${window.location.origin}/token/logout`);
            }, 500);
            return Promise.reject(new Error(errorMsg));
        }

        message.error(errorMsg);
        return Promise.reject(new Error(errorMsg));
    },
    error => {
        // 如果正在登出，静默处理所有错误
        if (isLoggingOut() || error?.isLogoutError || axios.isCancel(error)) {
            console.log('[api.ts] 登出中，静默处理错误:', error?.config?.url || error?.message);
            return Promise.reject(error);
        }

        // HTTP 错误处理
        let errorMsg = '网络错误，请检查网络连接';
        let useBackendMessage = false;

        if (error.response) {
            const { status, data } = error.response;

            // 优先使用后端返回的错误消息
            if (data?.message && typeof data.message === 'string') {
                errorMsg = data.message;
                useBackendMessage = true;
            }

            switch (status) {
                case 400:
                    if (!useBackendMessage) errorMsg = '请求参数错误';
                    break;
                case 401: {
                    // 【单层 SSO】401 表示 SSO 会话失效，直接跳转 SSO 登出
                    if (!useBackendMessage) errorMsg = '未授权，请重新登录';

                    // 防止重复跳转
                    const redirectingKey = '__auth_redirecting__';
                    if (sessionStorage.getItem(redirectingKey)) {
                        console.warn('[api.ts] 401 但已在重定向中');
                        break;
                    }

                    // 检查是否主动登出
                    if (sessionStorage.getItem('__sso_force_logout__')) {
                        console.log('[api.ts] 401 主动登出中，忽略');
                        break;
                    }

                    sessionStorage.setItem(redirectingKey, '1');

                    // 单层 SSO 架构：统一跳转 SSO 网关登出
                    console.log('[api.ts] 401 跳转 SSO 登出');
                    setTimeout(() => {
                        sessionStorage.removeItem(redirectingKey);
                        window.location.replace(`${window.location.origin}/token/logout`);
                    }, 500);
                    break;
                }
                case 403:
                    if (!useBackendMessage) errorMsg = '禁止访问';
                    break;
                case 404:
                    if (!useBackendMessage) errorMsg = '请求的资源不存在';
                    break;
                case 500:
                    if (!useBackendMessage) errorMsg = '服务器内部错误';
                    break;
                case 502:
                    if (!useBackendMessage) errorMsg = '网关错误';
                    break;
                case 503:
                    if (!useBackendMessage) errorMsg = '服务暂时不可用';
                    break;
                default:
                    if (!useBackendMessage) errorMsg = `请求失败 (${status})`;
            }
        } else if (error.code === 'ECONNABORTED') {
            errorMsg = '请求超时，请稍后重试';
        }

        message.error(errorMsg);
        console.error('Response error:', error);
        return Promise.reject(error);
    }
);

/**
 * 封装的请求方法
 */
export const api = {
    get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return axiosInstance.get(url, config).then(res => res.data);
    },

    post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return axiosInstance.post(url, data, config).then(res => res.data);
    },

    put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return axiosInstance.put(url, data, config).then(res => res.data);
    },

    patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return axiosInstance.patch(url, data, config).then(res => res.data);
    },

    delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return axiosInstance.delete(url, config).then(res => res.data);
    },

    upload<T = unknown>(url: string, file: File, fieldName = 'file', data?: Record<string, unknown>): Promise<ApiResponse<T>> {
        const formData = new FormData();
        formData.append(fieldName, file);

        if (data) {
            Object.entries(data).forEach(([key, value]) => {
                formData.append(key, String(value));
            });
        }

        return axiosInstance.post(url, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }).then(res => res.data);
    },

    download(url: string, filename: string, config?: AxiosRequestConfig): Promise<void> {
        return axiosInstance
            .get(url, { ...config, responseType: 'blob' })
            .then(res => {
                const blob = new Blob([res.data]);
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = filename;
                link.click();
                URL.revokeObjectURL(link.href);
            });
    },
};

export default api;
