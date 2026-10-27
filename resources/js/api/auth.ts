
import { request } from "./http";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

export interface AuthResponse {
  message: string;
  user: AuthUser;
  token: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export async function register(
  input: RegisterInput,
): Promise<AuthResponse> {
  return request<AuthResponse>("/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function login(
  input: LoginInput,
): Promise<AuthResponse> {
  return request<AuthResponse>("/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function logout(): Promise<void> {
  await request<{ message: string }>("/logout", {
    method: "POST",
  });
}
