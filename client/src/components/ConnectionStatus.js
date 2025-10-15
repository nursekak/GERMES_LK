import React, { useState, useEffect } from 'react';
import { Alert, Button, Space } from 'antd';
import { WifiOutlined, DisconnectOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../utils/api';

const ConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isServerReachable, setIsServerReachable] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState(null);

  // Проверка статуса подключения
  const checkConnection = async () => {
    try {
      await api.get('/health');
      setIsServerReachable(true);
      setRetryCount(0);
      setLastError(null);
    } catch (error) {
      setIsServerReachable(false);
      setLastError(error.message);
      setRetryCount(prev => prev + 1);
    }
  };

  // Проверка онлайн статуса
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Периодическая проверка сервера
  useEffect(() => {
    const interval = setInterval(checkConnection, 30000); // Каждые 30 секунд
    checkConnection(); // Первоначальная проверка

    return () => clearInterval(interval);
  }, []);

  // Если все в порядке, не показываем ничего
  if (isOnline && isServerReachable) {
    return null;
  }

  const getStatusMessage = () => {
    if (!isOnline) {
      return {
        type: 'error',
        message: 'Нет подключения к интернету',
        description: 'Проверьте ваше интернет-соединение'
      };
    }

    if (!isServerReachable) {
      return {
        type: 'warning',
        message: 'Сервер недоступен',
        description: `Попытка ${retryCount}. ${lastError ? `Ошибка: ${lastError}` : 'Проверяем подключение...'}`
      };
    }

    return null;
  };

  const status = getStatusMessage();
  if (!status) return null;

  return (
    <Alert
      type={status.type}
      message={status.message}
      description={
        <Space direction="vertical" size="small">
          <span>{status.description}</span>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={checkConnection}
            loading={retryCount > 0}
          >
            Повторить
          </Button>
        </Space>
      }
      icon={isOnline ? <DisconnectOutlined /> : <WifiOutlined />}
      showIcon
      style={{ marginBottom: 16 }}
      closable
    />
  );
};

export default ConnectionStatus;
