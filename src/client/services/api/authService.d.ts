export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: string;
    location?: string;
}
export interface AuthResponse {
    user: AuthUser;
    token: string;
}
/**
 * Clean mock authentication service.
 * Can be swapped for real fetch/axios calls to the Node.js backend later.
 */
declare class AuthService {
    private isMock;
    login(email: string, password: string): Promise<AuthResponse>;
    register(data: any): Promise<AuthResponse>;
    logout(): Promise<void>;
    getCurrentUser(token: string): Promise<AuthUser>;
}
export declare const authService: AuthService;
export {};
