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
  Tooltip,
  Modal,
  Form,
  Input,
  TimePicker
} from 'antd';
import { 
  ClockCircleOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  UserOutlined,
  CalendarOutlined,
  DownloadOutlined,
  PlusOutlined,
  EditOutlined
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
  const [workplaces, setWorkplaces] = useState([]);
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [checkOutModalVisible, setCheckOutModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Загрузка статистики посещений
  const fetchStats = async () => {
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
      
      console.log('Stats API response:', response.data);
      
      // Для менеджера берем статистику из userStats, для обычного пользователя - из stats
      if (isManager && response.data.userStats) {
        // Если есть выбранный пользователь, берем его статистику
        if (selectedUser) {
          const userStat = response.data.userStats.find(stat => stat.user.id === selectedUser);
          setStats(userStat ? {
            totalDays: userStat.totalDays,
            presentDays: userStat.presentDays,
            lateDays: userStat.lateDays
          } : {});
        } else {
          // Если нет выбранного пользователя, показываем общую статистику
          const totalStats = response.data.userStats.reduce((acc, userStat) => ({
            totalDays: acc.totalDays + userStat.totalDays,
            presentDays: acc.presentDays + userStat.presentDays,
            lateDays: acc.lateDays + userStat.lateDays
          }), { totalDays: 0, presentDays: 0, lateDays: 0 });
          setStats(totalStats);
        }
      } else {
        setStats(response.data.stats || response.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
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

      console.log('Fetching attendance with params:', params);
      const response = isManager 
        ? await api.get('/attendance/all-stats', { params })
        : await api.get('/attendance/my-stats', { params });
      
      console.log('Attendance API response:', response.data);
      
      // Убеждаемся, что мы устанавливаем массив
      let attendanceArray = [];
      
      if (response.data.attendance) {
        // Если есть прямой массив attendance
        attendanceArray = response.data.attendance;
        console.log('Using direct attendance array:', attendanceArray.length);
      } else if (response.data.userStats) {
        // Если есть userStats, извлекаем все записи из records
        console.log('userStats structure:', response.data.userStats);
        attendanceArray = response.data.userStats.flatMap(userStat => {
          console.log('userStat:', userStat);
          return userStat.records || [];
        });
        console.log('Extracted from userStats:', attendanceArray.length);
      }
      
      console.log('Final attendance data:', attendanceArray);
      setAttendanceData(Array.isArray(attendanceArray) ? attendanceArray : []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      message.error('Ошибка загрузки данных посещений');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка списка пользователей (для руководителей)
  const fetchUsers = async () => {
    console.log('fetchUsers called, isManager:', isManager);
    if (!isManager) {
      console.log('Not a manager, skipping users fetch');
      return;
    }
    
    try {
      console.log('Fetching users...');
      const response = await api.get('/users', {
        params: {
          limit: 1000, // Загружаем всех пользователей
          page: 1
        }
      });
      console.log('Users API response:', response.data);
      const usersArray = response.data.users || [];
      console.log('Users array:', usersArray);
      setUsers(Array.isArray(usersArray) ? usersArray : []);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
      message.error('Ошибка загрузки пользователей');
    }
  };

  // Загрузка списка мест работы
  const fetchWorkplaces = async () => {
    try {
      console.log('Fetching workplaces...');
      const response = await api.get('/workplaces', {
        params: {
          limit: 1000, // Загружаем все места работы
          page: 1
        }
      });
      console.log('Workplaces API response:', response.data);
      const workplacesArray = response.data.workplaces || [];
      console.log('Workplaces array:', workplacesArray);
      setWorkplaces(Array.isArray(workplacesArray) ? workplacesArray : []);
    } catch (error) {
      console.error('Ошибка загрузки мест работы:', error);
      message.error('Ошибка загрузки мест работы');
    }
  };

  useEffect(() => {
    console.log('Attendance useEffect - isManager:', isManager, 'user:', user);
    fetchStats();
    fetchAttendance();
    fetchUsers();
    fetchWorkplaces();
  }, [dateRange, selectedUser, isManager]);

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

  // Ручная отметка присутствия
  const handleManualCheckIn = async (values) => {
    console.log('handleManualCheckIn called with values:', values);
    try {
      const { userId, workplaceId, checkInTime, notes } = values;
      
      console.log('Sending check-in request:', {
        userId,
        workplaceId,
        checkInTime: checkInTime ? checkInTime.format('YYYY-MM-DD HH:mm:ss') : null,
        notes
      });
      
      const response = await api.post('/attendance/manual-check-in', {
        userId,
        workplaceId,
        checkInTime: checkInTime ? checkInTime.format('YYYY-MM-DD HH:mm:ss') : null,
        notes
      });
      
      console.log('Check-in response:', response.data);
      message.success('Присутствие отмечено');
      setManualModalVisible(false);
      form.resetFields();
      
      // Принудительно обновляем данные
      console.log('Manual check-in successful, refreshing data...');
      await fetchAttendance();
      await fetchStats();
    } catch (error) {
      console.error('Error in handleManualCheckIn:', error);
      const errorMessage = error.response?.data?.message || 'Ошибка отметки присутствия';
      message.error(errorMessage);
    }
  };

  // Ручная отметка ухода
  const handleManualCheckOut = async (values) => {
    console.log('handleManualCheckOut called with values:', values);
    try {
      const { userId, checkOutTime, notes } = values;
      
      console.log('Sending check-out request:', {
        userId,
        checkOutTime: checkOutTime ? checkOutTime.format('YYYY-MM-DD HH:mm:ss') : null,
        notes
      });
      
      const response = await api.post('/attendance/manual-check-out', {
        userId,
        checkOutTime: checkOutTime ? checkOutTime.format('YYYY-MM-DD HH:mm:ss') : null,
        notes
      });
      
      console.log('Check-out response:', response.data);
      message.success('Уход отмечен');
      setCheckOutModalVisible(false);
      form.resetFields();
      
      // Принудительно обновляем данные
      console.log('Manual check-out successful, refreshing data...');
      await fetchAttendance();
      await fetchStats();
    } catch (error) {
      console.error('Error in handleManualCheckOut:', error);
      const errorMessage = error.response?.data?.message || 'Ошибка отметки ухода';
      message.error(errorMessage);
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
          <Space>
            {isManager && (
              <>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={() => setManualModalVisible(true)}
                >
                  Отметить присутствие
                </Button>
                <Button 
                  icon={<EditOutlined />} 
                  onClick={() => setCheckOutModalVisible(true)}
                >
                  Отметить уход
                </Button>
              </>
            )}
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              onClick={handleExport}
            >
              Экспорт
            </Button>
          </Space>
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
                  {Array.isArray(users) && users.map(user => (
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
          dataSource={Array.isArray(attendanceData) ? attendanceData : []}
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

      {/* Модальное окно для ручной отметки присутствия */}
      <Modal
        title="Отметить присутствие"
        open={manualModalVisible}
        onCancel={() => {
          setManualModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleManualCheckIn}
        >
          <Form.Item
            name="userId"
            label="Сотрудник"
            rules={[{ required: true, message: 'Выберите сотрудника' }]}
          >
            <Select placeholder="Выберите сотрудника">
              {Array.isArray(users) && users.map(user => (
                <Option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.email})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="workplaceId"
            label="Место работы"
            rules={[{ required: true, message: 'Выберите место работы' }]}
          >
            <Select placeholder="Выберите место работы">
              {Array.isArray(workplaces) && workplaces.filter(wp => wp.isActive).map(workplace => (
                <Option key={workplace.id} value={workplace.id}>
                  {workplace.name} - {workplace.address}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="checkInTime"
            label="Время прихода"
            rules={[{ required: true, message: 'Выберите время прихода' }]}
          >
            <DatePicker 
              showTime 
              format="YYYY-MM-DD HH:mm"
              placeholder="Выберите дату и время"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Комментарий"
          >
            <Input.TextArea 
              placeholder="Дополнительная информация (необязательно)"
              rows={3}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setManualModalVisible(false)}>
                Отмена
              </Button>
              <Button type="primary" htmlType="submit">
                Отметить присутствие
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно для ручной отметки ухода */}
      <Modal
        title="Отметить уход"
        open={checkOutModalVisible}
        onCancel={() => {
          setCheckOutModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleManualCheckOut}
        >
          <Form.Item
            name="userId"
            label="Сотрудник"
            rules={[{ required: true, message: 'Выберите сотрудника' }]}
          >
            <Select placeholder="Выберите сотрудника">
              {Array.isArray(users) && users.map(user => (
                <Option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.email})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="checkOutTime"
            label="Время ухода"
            rules={[{ required: true, message: 'Выберите время ухода' }]}
          >
            <DatePicker 
              showTime 
              format="YYYY-MM-DD HH:mm"
              placeholder="Выберите дату и время"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Комментарий"
          >
            <Input.TextArea 
              placeholder="Дополнительная информация (необязательно)"
              rows={3}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCheckOutModalVisible(false)}>
                Отмена
              </Button>
              <Button type="primary" htmlType="submit">
                Отметить уход
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Attendance;
