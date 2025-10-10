import React from 'react';
import { useQuery } from 'react-query';
import { Card, Row, Col, Statistic, Typography, Spin, Alert, Button, Space } from 'antd';
import {
  UserOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  QrcodeOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const { Title } = Typography;

const Dashboard = () => {
  const { user, isManager } = useAuth();

  // Загрузка статистики
  const { data: stats, isLoading, error, refetch } = useQuery(
    'dashboard-stats',
    async () => {
      const [attendanceRes, reportsRes] = await Promise.all([
        axios.get('/api/attendance/my-stats'),
        axios.get('/api/reports/my-reports?limit=5')
      ]);

      return {
        attendance: attendanceRes.data.stats,
        recentReports: reportsRes.data.reports
      };
    },
    {
      refetchInterval: 30000, // Обновление каждые 30 секунд
    }
  );

  // Загрузка общей статистики для руководителей
  const { data: managerStats } = useQuery(
    'manager-stats',
    async () => {
      const [usersRes, workplacesRes, allAttendanceRes] = await Promise.all([
        axios.get('/api/users?limit=1'),
        axios.get('/api/workplaces?limit=1'),
        axios.get('/api/attendance/all-stats')
      ]);

      return {
        totalUsers: usersRes.data.pagination.total,
        totalWorkplaces: workplacesRes.data.pagination.total,
        totalAttendance: allAttendanceRes.data.totalRecords
      };
    },
    {
      enabled: isManager,
    }
  );

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p style={{ marginTop: '16px' }}>Загрузка статистики...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Ошибка загрузки данных"
        description="Не удалось загрузить статистику. Попробуйте обновить страницу."
        type="error"
        action={
          <Button size="small" onClick={() => refetch()}>
            Обновить
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Добро пожаловать, {user?.firstName}!
          </Title>
          <p style={{ margin: '8px 0 0 0', color: '#666' }}>
            {isManager ? 'Панель управления руководителя' : 'Ваша рабочая панель'}
          </p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
          Обновить
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        {/* Статистика посещений */}
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Всего дней"
              value={stats?.attendance?.totalDays || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Вовремя"
              value={stats?.attendance?.presentDays || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Опозданий"
              value={stats?.attendance?.lateDays || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Среднее время"
              value={stats?.attendance?.averageHours?.toFixed(1) || 0}
              suffix="ч"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>

        {/* Статистика для руководителей */}
        {isManager && managerStats && (
          <>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic
                  title="Всего сотрудников"
                  value={managerStats.totalUsers}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic
                  title="Мест работы"
                  value={managerStats.totalWorkplaces}
                  prefix={<EnvironmentOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic
                  title="Всего посещений"
                  value={managerStats.totalAttendance}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
          </>
        )}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        {/* Быстрые действия */}
        <Col xs={24} lg={12}>
          <Card title="Быстрые действия" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                type="primary" 
                icon={<QrcodeOutlined />} 
                block
                href="/qr-scanner"
              >
                Отметить явку
              </Button>
              <Button 
                icon={<FileTextOutlined />} 
                block
                href="/reports"
              >
                Создать отчет
              </Button>
              <Button 
                icon={<ClockCircleOutlined />} 
                block
                href="/attendance"
              >
                Посмотреть посещения
              </Button>
              {isManager && (
                <Button 
                  icon={<UserOutlined />} 
                  block
                  href="/users"
                >
                  Управление сотрудниками
                </Button>
              )}
            </Space>
          </Card>
        </Col>

        {/* Последние отчеты */}
        <Col xs={24} lg={12}>
          <Card title="Последние отчеты" size="small">
            {stats?.recentReports?.length > 0 ? (
              <div>
                {stats.recentReports.map((report) => (
                  <div key={report.id} style={{ 
                    padding: '8px 0', 
                    borderBottom: '1px solid #f0f0f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: '500' }}>{report.title}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {new Date(report.reportDate).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                    <span style={{
                      padding: '2px 8px',
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
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                Нет отчетов
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
