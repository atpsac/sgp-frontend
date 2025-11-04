export interface User {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
  avatarUrl?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
