import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  DatePicker, 
  Select, 
  Button, 
  Space, 
  Typography,
  Tag,
  Statistic,
  Row,
  Col,
  message,
  Tooltip
} from 'antd';
import { 
  ClockCircleOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  UserOutlined,
  CalendarOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const Attendance = () => {
  const { user, isManager } = useAuth();
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({});
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, 'day'),
    dayjs()
  ]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);

  // Загрузка статистики посещений
  const fetchStats = async () => {
    try {
      const response = await api.get('/attendance/my-stats');
      setStats(response.data);
    } catch (error) {
      message.error('Ошибка загрузки статистики');
    }
  };

  // Загрузка данных посещений
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = {
        startDate: dateRange[0]?.format('YYYY-MM-DD'),
        endDate: dateRange[1]?.format('YYYY-MM-DD'),
      };
      
      if (isManager && selectedUser) {
        params.userId = selectedUser;
      }

      const response = isManager 
        ? await api.get('/attendance/all-stats', { params })
        : await api.get('/attendance/my-stats', { params });
      
      setAttendanceData(response.data.attendance || response.data);
    } catch (error) {
      message.error('Ошибка загрузки данных посещений');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка списка пользователей (для руководителей)
  const fetchUsers = async () => {
    if (!isManager) return;
    
    try {
      const response = await api.get('/users');
      setUsers(response.data.users);
    } catch (error) {
      message.error('Ошибка загрузки пользователей');
    }
  };

  useEffect(() => {
    fetchStats();
    fetchAttendance();
    fetchUsers();
  }, [dateRange, selectedUser]);

  // Экспорт данных
  const handleExport = async () => {
    try {
      const params = {
        startDate: dateRange[0]?.format('YYYY-MM-DD'),
        endDate: dateRange[1]?.format('YYYY-MM-DD'),
        format: 'csv'
      };
      
      if (isManager && selectedUser) {
        params.userId = selectedUser;
      }

      const response = await api.get('/attendance/export', { 
        params,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_${dayjs().format('YYYY-MM-DD')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      message.success('Данные экспортированы');
    } catch (error) {
      message.error('Ошибка экспорта данных');
    }
  };

  const columns = [
    {
      title: 'Дата',
      dataIndex: 'checkInTime',
      key: 'checkInTime',
      render: (date) => dayjs(date).format('DD.MM.YYYY'),
      sorter: (a, b) => new Date(a.checkInTime) - new Date(b.checkInTime),
    },
    {
      title: 'Время прихода',
      dataIndex: 'checkInTime',
      key: 'checkInTime',
      render: (date) => dayjs(date).format('HH:mm'),
    },
    {
      title: 'Время ухода',
      dataIndex: 'checkOutTime',
      key: 'checkOutTime',
      render: (date) => date ? dayjs(date).format('HH:mm') : '-',
    },
    {
      title: 'Место работы',
      dataIndex: 'workplace',
      key: 'workplace',
      render: (workplace) => workplace?.name || '-',
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusConfig = {
          present: { color: 'green', text: 'Вовремя', icon: <CheckCircleOutlined /> },
          late: { color: 'orange', text: 'Опоздание', icon: <ClockCircleOutlined /> },
          absent: { color: 'red', text: 'Отсутствие', icon: <CloseCircleOutlined /> }
        };
        const config = statusConfig[status] || statusConfig.present;
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    ...(isManager ? [{
      title: 'Сотрудник',
      dataIndex: 'user',
      key: 'user',
      render: (user) => user ? `${user.firstName} ${user.lastName}` : '-',
    }] : []),
  ];

  return (
    <div>
      <Card>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '24px' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ClockCircleOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <Title level={3} style={{ margin: 0 }}>Посещения</Title>
          </div>
          <Button 
            type="primary" 
            icon={<DownloadOutlined />} 
            onClick={handleExport}
          >
            Экспорт
          </Button>
        </div>

        {/* Фильтры */}
        <Card style={{ marginBottom: '24px' }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={8}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Период:
              </label>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                style={{ width: '100%' }}
              />
            </Col>
            {isManager && (
              <Col xs={24} sm={12} md={8}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Сотрудник:
                </label>
                <Select
                  placeholder="Все сотрудники"
                  value={selectedUser}
                  onChange={setSelectedUser}
                  style={{ width: '100%' }}
                  allowClear
                >
                  {users.map(user => (
                    <Option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </Option>
                  ))}
                </Select>
              </Col>
            )}
          </Row>
        </Card>

        {/* Статистика */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Всего дней"
                value={stats.totalDays || 0}
                prefix={<CalendarOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Присутствовал"
                value={stats.presentDays || 0}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Опозданий"
                value={stats.lateDays || 0}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Таблица посещений */}
        <Table
          columns={columns}
          dataSource={attendanceData}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} из ${total} записей`,
          }}
        />
      </Card>
    </div>
  );
};

export default Attendance;
