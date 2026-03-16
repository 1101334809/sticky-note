/**
 * 通用类型定义
 */

/** API 响应基础结构 */
export interface ApiResponse<T = unknown> {
    code: number;
    message: string;
    data: T;
}

/** 分页请求参数 */
export interface PaginationParams {
    page?: number;
    page_size?: number;
}

/** 分页响应结构 */
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

/** 用户信息 */
export interface UserInfo {
    id: number;
    username: string;
    display_name: string;
    job_number?: string;
    role: string;
    email?: string;
    mobile?: string;
    avatar_url?: string;
    department_id?: number;
    department_name?: string;
    is_active: boolean;
    last_login_at?: string;
    created_at: string;
}
