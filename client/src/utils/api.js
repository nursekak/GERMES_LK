import axios from 'axios';

// Создание экземпляра axios с базовой конфигурацией
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 30000, // Увеличиваем таймаут
  headers: {
    'Content-Type': 'application/json',
  },
});

// Ограничение на частоту запросов
const MAX_REQUESTS_PER_SECOND = 5;
let lastRequestTime = 0;

// Функция для ограничения частоты запросов
const rateLimitRequest = async (config) => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  const minInterval = 1000 / MAX_REQUESTS_PER_SECOND; // 200ms между запросами

  if (timeSinceLastRequest < minInterval) {
    const delay = minInterval - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  lastRequestTime = Date.now();
  return config;
};

// Интерцептор для добавления токена к запросам и ограничения частоты
api.interceptors.request.use(
  async (config) => {
    // Применяем ограничение частоты запросов
    await rateLimitRequest(config);
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Интерцептор для обработки ответов с retry логикой
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Логирование ошибок для диагностики
    console.error('API Error:', {
      url: originalRequest?.url,
      method: originalRequest?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    // Retry логика для временных сбоев
    if (error.response?.status >= 500 && !originalRequest._retry) {
      originalRequest._retry = true;
      const retryDelay = Math.pow(2, originalRequest._retryCount || 0) * 1000; // Экспоненциальная задержка
      
      if ((originalRequest._retryCount || 0) < 3) {
        originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
        
        console.log(`Retrying request in ${retryDelay}ms (attempt ${originalRequest._retryCount})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        return api(originalRequest);
      }
    }
    
    if (error.response?.status === 401) {
      // Токен истек или недействителен
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    if (error.response?.status === 404) {
      // 404 ошибка - возможно неправильный endpoint
      console.error('404 Error - Endpoint not found:', originalRequest?.url);
    }
    
    if (error.response?.status === 429) {
      // Слишком много запросов - увеличиваем задержку
      console.log('Rate limit exceeded, increasing delay');
      const delay = 5000; // 5 секунд
      await new Promise(resolve => setTimeout(resolve, delay));
      return api(originalRequest);
    }
    
    return Promise.reject(error);
  }
);

export default api;
