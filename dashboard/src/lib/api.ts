const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

    if (res.status === 401) {
      // Try refresh
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        this.clearToken();
        if (typeof window !== 'undefined') window.location.href = '/login';
        throw new Error('Session expired');
      }
      headers['Authorization'] = `Bearer ${this.token}`;
      const retry = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
      if (!retry.ok) throw new Error(await retry.text());
      return retry.json();
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(Array.isArray(err.message) ? err.message[0] : err.message || 'Request failed');
    }
    return res.json();
  }

  private async refreshToken(): Promise<boolean> {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      this.setToken(data.data.accessToken);
      if (typeof window !== 'undefined') localStorage.setItem('refreshToken', data.data.refreshToken);
      return true;
    } catch { return false; }
  }

  // Auth
  login(email: string, password: string) { return this.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); }
  register(data: any) { return this.request('/auth/register', { method: 'POST', body: JSON.stringify(data) }); }
  logout() { return this.request('/auth/logout', { method: 'POST' }).finally(() => this.clearToken()); }

  // Tenant
  getTenant() { return this.request('/tenant'); }
  getTenantStats() { return this.request('/tenant/stats'); }

  // Products
  getProducts(params?: string) { return this.request(`/products${params ? '?' + params : ''}`); }
  createProduct(data: any) { return this.request('/products', { method: 'POST', body: JSON.stringify(data) }); }

  // Orders
  getOrders(params?: string) { return this.request(`/orders${params ? '?' + params : ''}`); }
  createOrder(data: any) { return this.request('/orders', { method: 'POST', body: JSON.stringify(data) }); }
  updateOrderStatus(id: string, status: string) { return this.request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); }

  // Contacts
  getContacts(params?: string) { return this.request(`/contacts${params ? '?' + params : ''}`); }
  createContact(data: any) { return this.request('/contacts', { method: 'POST', body: JSON.stringify(data) }); }

  // Conversations
  getConversations(params?: string) { return this.request(`/conversations${params ? '?' + params : ''}`); }
  getConversation(id: string) { return this.request(`/conversations/${id}`); }
  sendMessage(conversationId: string, text: string) { return this.request(`/conversations/${conversationId}/messages/text`, { method: 'POST', body: JSON.stringify({ text }) }); }
  assignConversation(id: string, assigneeId: string) { return this.request(`/conversations/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ assigneeId }) }); }

  // WhatsApp
  getWhatsappStatus() { return this.request('/whatsapp/status'); }
  connectWhatsapp() { return this.request('/whatsapp/connect', { method: 'POST' }); }
  getQrCode() { return this.request('/whatsapp/qrcode'); }

  // Analytics
  getDashboard(period?: string) { return this.request(`/analytics/dashboard${period ? '?period=' + period : ''}`); }

  // Broadcasts
  getBroadcasts() { return this.request('/broadcasts'); }
  createBroadcast(data: any) { return this.request('/broadcasts', { method: 'POST', body: JSON.stringify(data) }); }
  sendBroadcast(id: string) { return this.request(`/broadcasts/${id}/send`, { method: 'POST' }); }

  // Notifications
  getNotifications() { return this.request('/notifications'); }
  markAllRead() { return this.request('/notifications/read-all', { method: 'POST' }); }

  // Coupons
  getCoupons() { return this.request('/coupons'); }
  validateCoupon(code: string, orderTotal: number) { return this.request('/coupons/validate', { method: 'POST', body: JSON.stringify({ code, orderTotal }) }); }

  // Payments
  initiatePayment(orderId: string, method: string) { return this.request(`/payments/initiate/${orderId}`, { method: 'POST', body: JSON.stringify({ method }) }); }

  // Tags
  getTags() { return this.request('/tags'); }

  // Quick Replies
  getQuickReplies() { return this.request('/quick-replies'); }

  // Generic
  get<T = any>(endpoint: string) { return this.request<T>(endpoint); }
  post<T = any>(endpoint: string, data?: any) { return this.request<T>(endpoint, { method: 'POST', body: data ? JSON.stringify(data) : undefined }); }
  patch<T = any>(endpoint: string, data?: any) { return this.request<T>(endpoint, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }); }
  del<T = any>(endpoint: string) { return this.request<T>(endpoint, { method: 'DELETE' }); }
}

export const api = new ApiClient();
export default api;
