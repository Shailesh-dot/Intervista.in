import axios from 'axios';

const api = axios.create({
  baseURL: '/api/verification',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;