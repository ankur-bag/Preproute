// lib/clientApi.ts
import axios from 'axios';

const clientApi = axios.create({
  baseURL: '/api/proxy',
});

clientApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default clientApi;
