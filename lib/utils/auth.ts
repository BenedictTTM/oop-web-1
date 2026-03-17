export interface DecodedToken {
  userId: string;
  email: string;
  studentId: string;
  status?: string;
  iat?: number;
  exp?: number;
}

export function decodeJWT(token: string): DecodedToken | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

export function isTokenExpired(): boolean {
  const token = localStorage.getItem('token');
  if (!token) return true;

  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return true;

  // exp is in seconds, Date.now() is in milliseconds
  return decoded.exp * 1000 < Date.now();
}

export function getUserStatus(): 'pending' | 'approved' | 'rejected' | null {
  const token = localStorage.getItem('token');
  if (!token) return null;

  const decoded = decodeJWT(token);
  if (!decoded || !decoded.status) return null;

  return decoded.status as 'pending' | 'approved' | 'rejected';
}

export function getUserEmail(): string | null {
  const token = localStorage.getItem('token');
  if (!token) return null;

  const decoded = decodeJWT(token);
  if (!decoded || !decoded.email) return null;

  return decoded.email;
}

