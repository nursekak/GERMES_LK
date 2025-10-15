import { useState, useCallback, useRef } from 'react';

/**
 * Хук для кэширования API запросов
 * @param {Function} apiFunction - функция API запроса
 * @param {number} cacheTime - время кэширования в миллисекундах (по умолчанию 5 минут)
 * @returns {Object} - объект с данными, загрузкой и функцией обновления
 */
export const useApiCache = (apiFunction, cacheTime = 5 * 60 * 1000) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cacheRef = useRef({});
  const lastFetchRef = useRef(0);

  const fetchData = useCallback(async (...args) => {
    const cacheKey = JSON.stringify(args);
    const now = Date.now();
    
    // Проверяем кэш
    if (cacheRef.current[cacheKey] && (now - lastFetchRef.current) < cacheTime) {
      setData(cacheRef.current[cacheKey]);
      return cacheRef.current[cacheKey];
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiFunction(...args);
      cacheRef.current[cacheKey] = result;
      lastFetchRef.current = now;
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunction, cacheTime]);

  const clearCache = useCallback(() => {
    cacheRef.current = {};
    lastFetchRef.current = 0;
  }, []);

  return {
    data,
    loading,
    error,
    fetchData,
    clearCache
  };
};
