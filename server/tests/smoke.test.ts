import { describe, it, expect } from 'vitest';
import axios from 'axios';

const baseUrl = process.env.TEST_API_URL;

describe('smoke', () => {
  it.skipIf(!baseUrl)('health endpoint responds', async () => {
    const res = await axios.get(`${baseUrl}/system/health`, { withCredentials: true });
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('OK');
  });
});
