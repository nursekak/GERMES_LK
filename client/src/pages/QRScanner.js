import React, { useState, useRef, useEffect } from 'react';
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
  const [qrDetected, setQrDetected] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const scanIntervalRef = useRef(null);

  // Очистка при размонтировании компонента
  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

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

  // Функция для распознавания QR кодов
  const detectQRCode = () => {
    if (!videoRef.current || !canvasRef.current || qrDetected) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Проверяем, что видео готово
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    // Устанавливаем размеры canvas равными размерам видео
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Рисуем текущий кадр видео на canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Получаем данные изображения
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    try {
      // Попытка использовать встроенный API для распознавания QR кодов
      if (window.BarcodeDetector) {
        // eslint-disable-next-line no-undef
        const barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
        barcodeDetector.detect(canvas)
          .then(barcodes => {
            if (barcodes.length > 0 && !qrDetected) {
              const qrCode = barcodes[0].rawValue;
              console.log('QR код обнаружен через BarcodeDetector:', qrCode);
              handleQRCode(qrCode);
            }
          })
          .catch(error => {
            console.log('Ошибка распознавания QR кода через BarcodeDetector:', error);
          });
      } else {
        // Fallback: простая проверка на наличие QR-кода в изображении
        // Ищем характерные паттерны QR кода в изображении
        const qrCode = detectQRPattern(imageData);
        if (qrCode && !qrDetected) {
          console.log('QR код обнаружен через fallback:', qrCode);
          handleQRCode(qrCode);
        }
      }
    } catch (error) {
      console.log('Ошибка при распознавании QR кода:', error);
    }
  };

  // Простая функция для поиска QR паттернов (упрощенная версия)
  const detectQRPattern = (imageData) => {
    // Это очень упрощенная версия для демонстрации
    // В реальном приложении нужна более сложная логика
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Ищем характерные квадраты QR кода
    // Это базовая реализация для демонстрации
    for (let y = 0; y < height - 20; y += 10) {
      for (let x = 0; x < width - 20; x += 10) {
        // Проверяем наличие квадрата (упрощенная версия)
        if (isQRPattern(data, width, x, y)) {
          // Возвращаем тестовый QR код для демонстрации
          return 'test-qr-code-' + Date.now();
        }
      }
    }
    return null;
  };

  // Проверка на наличие QR паттерна (упрощенная версия)
  const isQRPattern = (data, width, x, y) => {
    // Очень упрощенная проверка на наличие квадрата
    // В реальном приложении нужна более сложная логика
    const size = 20;
    let blackPixels = 0;
    let whitePixels = 0;
    
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const pixelIndex = ((y + dy) * width + (x + dx)) * 4;
        const r = data[pixelIndex];
        const g = data[pixelIndex + 1];
        const b = data[pixelIndex + 2];
        
        // Простая проверка на черный/белый пиксель
        const brightness = (r + g + b) / 3;
        if (brightness < 128) {
          blackPixels++;
        } else {
          whitePixels++;
        }
      }
    }
    
    // Если есть достаточно черных и белых пикселей, возможно это QR код
    return blackPixels > 50 && whitePixels > 50;
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
      setQrDetected(false);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Запускаем распознавание QR кодов каждые 500ms
        scanIntervalRef.current = setInterval(detectQRCode, 500);
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
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setScannerActive(false);
    setQrDetected(false);
  };

  // Обработка QR кода
  const handleQRCode = async (qrCode) => {
    if (qrDetected) return; // Предотвращаем множественные обработки
    
    setQrDetected(true);
    setLoading(true);
    
    // Останавливаем сканирование
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    try {
      console.log('Обработка QR кода:', qrCode);
      const response = await axios.post('/api/attendance/check-in', {
        qrCode: qrCode
      });
      
      message.success('Явка успешно зарегистрирована');
      setCurrentAttendance(response.data.attendance);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Ошибка регистрации явки';
      message.error(errorMessage);
      setQrDetected(false); // Разрешаем повторное сканирование при ошибке
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
              {/* Скрытый canvas для распознавания QR кодов */}
              <canvas
                ref={canvasRef}
                style={{ display: 'none' }}
              />
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <Space>
                <Button onClick={stopScanner}>
                  Остановить сканер
                </Button>
                <Button 
                  type="dashed" 
                  onClick={() => handleQRCode('test-qr-code-' + Date.now())}
                  disabled={qrDetected}
                >
                  Тест QR кода
                </Button>
              </Space>
              
              {qrDetected && (
                <div style={{ marginTop: '16px' }}>
                  <Alert
                    message="QR код обнаружен!"
                    description="Обработка QR кода..."
                    type="success"
                    showIcon
                  />
                </div>
              )}
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
