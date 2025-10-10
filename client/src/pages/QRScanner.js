import React, { useState, useRef } from 'react';
import { Card, Button, message, Alert, Space, Typography, Spin } from 'antd';
import { QrcodeOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const { Title, Text } = Typography;

const QRScanner = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentAttendance, setCurrentAttendance] = useState(null);
  const [scannerActive, setScannerActive] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Проверка поддержки камеры
  const checkCameraSupport = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      return videoDevices.length > 0;
    } catch (error) {
      console.error('Ошибка проверки камеры:', error);
      return false;
    }
  };

  // Запуск сканера
  const startScanner = async () => {
    const hasCamera = await checkCameraSupport();
    if (!hasCamera) {
      message.error('Камера не найдена или не поддерживается');
      return;
    }

    try {
      setScannerActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Ошибка доступа к камере:', error);
      message.error('Не удалось получить доступ к камере');
      setScannerActive(false);
    }
  };

  // Остановка сканера
  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScannerActive(false);
  };

  // Обработка QR кода
  const handleQRCode = async (qrCode) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/attendance/check-in', {
        qrCode: qrCode
      });
      
      message.success('Явка успешно зарегистрирована');
      setCurrentAttendance(response.data.attendance);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Ошибка регистрации явки';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Регистрация ухода
  const handleCheckOut = async () => {
    setLoading(true);
    try {
      await axios.post('/api/attendance/check-out');
      message.success('Уход с работы зарегистрирован');
      setCurrentAttendance(null);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Ошибка регистрации ухода';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Card>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Title level={2}>
            <QrcodeOutlined /> QR Сканер
          </Title>
          <Text type="secondary">
            Отсканируйте QR-код для регистрации явки на работу
          </Text>
        </div>

        {!scannerActive ? (
          <div style={{ textAlign: 'center' }}>
            <Button
              type="primary"
              size="large"
              icon={<QrcodeOutlined />}
              onClick={startScanner}
              style={{ marginBottom: '24px' }}
            >
              Запустить сканер
            </Button>
            
            <Alert
              message="Инструкция"
              description="1. Нажмите 'Запустить сканер' и разрешите доступ к камере\n2. Наведите камеру на QR-код места работы\n3. QR-код будет автоматически распознан и обработан"
              type="info"
              showIcon
            />
          </div>
        ) : (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ 
                  width: '100%', 
                  maxWidth: '400px', 
                  height: '300px',
                  border: '2px solid #1890ff',
                  borderRadius: '8px'
                }}
              />
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <Space>
                <Button onClick={stopScanner}>
                  Остановить сканер
                </Button>
              </Space>
            </div>
          </div>
        )}

        {currentAttendance && (
          <Card 
            style={{ 
              marginTop: '24px', 
              backgroundColor: '#f6ffed',
              border: '1px solid #b7eb8f'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <CheckCircleOutlined style={{ fontSize: '24px', color: '#52c41a', marginBottom: '8px' }} />
              <Title level={4} style={{ color: '#52c41a', margin: 0 }}>
                Явка зарегистрирована
              </Title>
              <Text>
                Место: {currentAttendance.workplace?.name}<br />
                Время: {new Date(currentAttendance.checkInTime).toLocaleString('ru-RU')}
              </Text>
              
              <div style={{ marginTop: '16px' }}>
                <Button
                  type="primary"
                  loading={loading}
                  onClick={handleCheckOut}
                  icon={<ClockCircleOutlined />}
                >
                  Отметить уход
                </Button>
              </div>
            </div>
          </Card>
        )}

        {loading && (
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <Spin size="large" />
            <p>Обработка...</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default QRScanner;
