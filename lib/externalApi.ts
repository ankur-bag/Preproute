// lib/externalApi.ts
import axios from 'axios';

const externalApi = axios.create({
  baseURL: process.env.EXTERNAL_API_BASE || 'https://admin-moderator-backend-staging.up.railway.app/api',
  timeout: 5000, // Timeout if the backend takes too long (troubles)
});

export default externalApi;
