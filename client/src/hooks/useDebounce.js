import { useState, useEffect } from 'react';

/**
 * Хук для дебаунсинга значений
 * @param {any} value - значение для дебаунсинга
 * @param {number} delay - задержка в миллисекундах
 * @returns {any} - дебаунсированное значение
 */
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Хук для дебаунсинга функций
 * @param {Function} func - функция для дебаунсинга
 * @param {number} delay - задержка в миллисекундах
 * @returns {Function} - дебаунсированная функция
 */
export const useDebouncedCallback = (func, delay) => {
  const [timeoutId, setTimeoutId] = useState(null);

  const debouncedFunc = (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const newTimeoutId = setTimeout(() => {
      func(...args);
    }, delay);

    setTimeoutId(newTimeoutId);
  };

  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return debouncedFunc;
};
