import { APIRequestContext } from '@playwright/test';

// Helper to authenticate requests in Playwright E2E tests
export async function getAuthHeaders(request: APIRequestContext, role: 'admin' | 'customer' = 'admin') {
  // In a real E2E environment, you'd perform a login via API first:
  /*
  const response = await request.post('/api/users/login', {
    data: { email: 'admin@example.com', password: 'password123' }
  });
  const data = await response.json();
  return { 'Authorization': `Bearer ${data.data.accessToken}` };
  */

  // As a fallback for Playwright (if standard user doesn't exist in test DB), 
  // you can either seed the DB first, or use a known test token if configured.
  // For now, this placeholder reminds developers to use actual API logins:
  return {
    'Authorization': 'Bearer YOUR_TEST_TOKEN_HERE' 
  };
}