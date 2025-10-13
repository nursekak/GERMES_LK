import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { Modal, Button, Input, message } from 'antd';
import { EyeOutlined, MessageOutlined } from '@ant-design/icons';

const Dashboard = () => {
  const { user, isManager } = useAuth();
  const [selectedReport, setSelectedReport] = useState(null);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
  const [comment, setComment] = useState('');

  // Загрузка статистики
  const { data: stats, isLoading, error, refetch } = useQuery(
    ['dashboard-stats'],
    async () => {
      try {
        const [attendanceRes, reportsRes] = await Promise.all([
          api.get('/attendance/my-stats'),
          isManager 
            ? api.get('/reports/all?limit=5') 
            : api.get('/reports/my-reports?limit=5')
        ]);

        console.log('Dashboard reports response:', reportsRes.data);
        return {
          attendance: attendanceRes.data.stats,
          recentReports: reportsRes.data.reports || reportsRes.data
        };
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return {
          attendance: null,
          recentReports: []
        };
      }
    },
    {
      refetchInterval: 30000, // Обновление каждые 30 секунд
      retry: 1
    }
  );

  // Загрузка общей статистики для руководителей
  const { data: managerStats } = useQuery(
    ['manager-stats'],
    async () => {
      try {
        const [usersRes, workplacesRes, fullStatsRes] = await Promise.all([
          api.get('/users?limit=1'),
          api.get('/workplaces?limit=1'),
          api.get('/attendance/full-stats-30-days')
        ]);

        return {
          totalUsers: usersRes.data.pagination?.total || 0,
          totalWorkplaces: workplacesRes.data.pagination?.total || 0,
          totalAttendance: fullStatsRes.data.days?.length || 0,
          totalEmployees: fullStatsRes.data.users?.length || 0
        };
      } catch (error) {
        console.error('Error fetching manager stats:', error);
        return {
          totalUsers: 0,
          totalWorkplaces: 0,
          totalAttendance: 0,
          totalEmployees: 0
        };
      }
    },
    {
      enabled: isManager,
      retry: 1
    }
  );

  // Функции для работы с отчетами
  const handleViewReport = (report) => {
    setSelectedReport(report);
    setIsReportModalVisible(true);
  };

  const handleAddComment = (report) => {
    setSelectedReport(report);
    setComment('');
    setIsCommentModalVisible(true);
  };

  const handleSubmitComment = async () => {
    try {
      await api.patch(`/reports/${selectedReport.id}/comment`, {
        comment: comment
      });
      message.success('Комментарий добавлен');
      setIsCommentModalVisible(false);
      setComment('');
      refetch(); // Обновляем данные
    } catch (error) {
      console.error('Error adding comment:', error);
      message.error('Ошибка при добавлении комментария');
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
        <p>Загрузка статистики...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: '#fff2f0',
        border: '1px solid #ffccc7',
        borderRadius: '6px',
        padding: '16px',
        marginBottom: '16px'
      }}>
        <h4 style={{ color: '#ff4d4f', margin: '0 0 8px 0' }}>Ошибка загрузки данных</h4>
        <p style={{ color: '#666', margin: '0 0 16px 0' }}>
          Не удалось загрузить статистику. Попробуйте обновить страницу.
        </p>
        <button
          onClick={() => refetch()}
          style={{
            background: '#ff4d4f',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Обновить
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ 
        marginBottom: '24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px' }}>
            Добро пожаловать, {user?.firstName}!
          </h2>
          <p style={{ margin: '8px 0 0 0', color: '#666' }}>
            {isManager ? 'Панель управления руководителя' : 'Ваша рабочая панель'}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          style={{
            background: 'none',
            border: '1px solid #d9d9d9',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔄 Обновить
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Статистика посещений */}
        <div style={{
          background: 'white',
          border: '1px solid #f0f0f0',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#1890ff' }}>{stats?.attendance?.totalDays || 0}</h3>
          <p style={{ margin: 0, color: '#666' }}>Всего дней</p>
        </div>
        
        <div style={{
          background: 'white',
          border: '1px solid #f0f0f0',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#52c41a' }}>{stats?.attendance?.presentDays || 0}</h3>
          <p style={{ margin: 0, color: '#666' }}>Вовремя</p>
        </div>
        
        <div style={{
          background: 'white',
          border: '1px solid #f0f0f0',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏰</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#faad14' }}>{stats?.attendance?.lateDays || 0}</h3>
          <p style={{ margin: 0, color: '#666' }}>Опозданий</p>
        </div>
        
        <div style={{
          background: 'white',
          border: '1px solid #f0f0f0',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏱️</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#722ed1' }}>
            {stats?.attendance?.averageHours?.toFixed(1) || 0}ч
          </h3>
          <p style={{ margin: 0, color: '#666' }}>Среднее время</p>
        </div>

        {/* Статистика для руководителей */}
        {isManager && managerStats && (
          <>
            <div style={{
              background: 'white',
              border: '1px solid #f0f0f0',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>👥</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#1890ff' }}>{managerStats.totalUsers}</h3>
              <p style={{ margin: 0, color: '#666' }}>Сотрудников</p>
            </div>
            
            <div style={{
              background: 'white',
              border: '1px solid #f0f0f0',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🏢</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#52c41a' }}>{managerStats.totalWorkplaces}</h3>
              <p style={{ margin: 0, color: '#666' }}>Мест работы</p>
            </div>
            
            <div style={{
              background: 'white',
              border: '1px solid #f0f0f0',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📈</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#faad14' }}>{managerStats.totalAttendance}</h3>
              <p style={{ margin: 0, color: '#666' }}>Дней в статистике</p>
            </div>
            
            <div style={{
              background: 'white',
              border: '1px solid #f0f0f0',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>👨‍💼</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#722ed1' }}>{managerStats.totalEmployees}</h3>
              <p style={{ margin: 0, color: '#666' }}>Активных сотрудников</p>
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {/* Быстрые действия */}
        <div style={{
          background: 'white',
          border: '1px solid #f0f0f0',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <h3 style={{ margin: '0 0 16px 0' }}>Быстрые действия</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <a 
              href="/qr-scanner"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: '#1890ff',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              📱 Отметить явку
            </a>
            <a 
              href="/reports"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: '#f0f0f0',
                color: '#333',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              📄 Создать отчет
            </a>
            <a 
              href="/attendance"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: '#f0f0f0',
                color: '#333',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              ⏰ Посмотреть посещения
            </a>
            {isManager && (
              <a 
                href="/users"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: '#f0f0f0',
                  color: '#333',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                👥 Управление сотрудниками
              </a>
            )}
          </div>
        </div>

        {/* Последние отчеты */}
        <div style={{
          background: 'white',
          border: '1px solid #f0f0f0',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <h3 style={{ margin: '0 0 16px 0' }}>Последние отчеты</h3>
          {stats?.recentReports?.length > 0 ? (
            <div>
              {stats.recentReports.map((report) => (
                <div key={report.id} style={{ 
                  padding: '12px 0', 
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500' }}>{report.title}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {new Date(report.reportDate).toLocaleDateString('ru-RU')}
                      {report.user && ` • ${report.user.firstName} ${report.user.lastName}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      backgroundColor: 
                        report.status === 'approved' ? '#f6ffed' :
                        report.status === 'rejected' ? '#fff2f0' :
                        report.status === 'submitted' ? '#fff7e6' : '#f0f0f0',
                      color:
                        report.status === 'approved' ? '#52c41a' :
                        report.status === 'rejected' ? '#ff4d4f' :
                        report.status === 'submitted' ? '#faad14' : '#666'
                    }}>
                      {report.status === 'approved' ? 'Утвержден' :
                       report.status === 'rejected' ? 'Отклонен' :
                       report.status === 'submitted' ? 'На рассмотрении' : 'Черновик'}
                    </span>
                    <Button
                      type="text"
                      icon={<EyeOutlined />}
                      onClick={() => handleViewReport(report)}
                      size="small"
                    >
                      Просмотр
                    </Button>
                    <Button
                      type="text"
                      icon={<MessageOutlined />}
                      onClick={() => handleAddComment(report)}
                      size="small"
                    >
                      Комментарий
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
              Нет отчетов
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно для просмотра отчета */}
      <Modal
        title="Просмотр отчета"
        open={isReportModalVisible}
        onCancel={() => setIsReportModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsReportModalVisible(false)}>
            Закрыть
          </Button>
        ]}
        width={800}
      >
        {selectedReport && (
          <div>
            <h3>{selectedReport.title}</h3>
            <p><strong>Дата:</strong> {new Date(selectedReport.reportDate).toLocaleDateString('ru-RU')}</p>
            {selectedReport.user && (
              <p><strong>Автор:</strong> {selectedReport.user.firstName} {selectedReport.user.lastName}</p>
            )}
            <p><strong>Статус:</strong> {
              selectedReport.status === 'approved' ? 'Утвержден' :
              selectedReport.status === 'rejected' ? 'Отклонен' :
              selectedReport.status === 'submitted' ? 'На рассмотрении' : 'Черновик'
            }</p>
            <div style={{ marginTop: '16px' }}>
              <h4>Содержание:</h4>
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#f5f5f5', 
                borderRadius: '4px',
                whiteSpace: 'pre-wrap'
              }}>
                {selectedReport.content}
              </div>
            </div>
            {selectedReport.comments && (
              <div style={{ marginTop: '16px' }}>
                <h4>Комментарии:</h4>
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: '#f9f9f9', 
                  borderRadius: '4px',
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedReport.comments}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Модальное окно для добавления комментария */}
      <Modal
        title="Добавить комментарий к отчету"
        open={isCommentModalVisible}
        onCancel={() => setIsCommentModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsCommentModalVisible(false)}>
            Отмена
          </Button>,
          <Button key="submit" type="primary" onClick={handleSubmitComment}>
            Добавить комментарий
          </Button>
        ]}
      >
        {selectedReport && (
          <div>
            <h4>{selectedReport.title}</h4>
            <p><strong>Автор:</strong> {selectedReport.user?.firstName} {selectedReport.user?.lastName}</p>
            <p><strong>Статус:</strong> {
              selectedReport.status === 'approved' ? 'Утвержден' :
              selectedReport.status === 'rejected' ? 'Отклонен' :
              selectedReport.status === 'submitted' ? 'На рассмотрении' : 'Черновик'
            }</p>
            
            {selectedReport.comments && (
              <div style={{ marginTop: '16px' }}>
                <h5>Существующие комментарии:</h5>
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: '#f9f9f9', 
                  borderRadius: '4px',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  marginBottom: '16px'
                }}>
                  {selectedReport.comments}
                </div>
              </div>
            )}
            
            <div style={{ marginTop: '16px' }}>
              <label>Ваш комментарий:</label>
              <Input.TextArea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Введите ваш комментарий..."
                rows={4}
                style={{ marginTop: '8px' }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Dashboard;