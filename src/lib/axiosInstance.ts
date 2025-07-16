import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // Express server
  withCredentials: true,
});

export default axiosInstance;
