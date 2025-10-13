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
  TimePicker,
  Drawer,
  Badge
} from 'antd';
import { 
  ClockCircleOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  UserOutlined,
  CalendarOutlined,
  DownloadOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const Attendance = () => {
  const { user, isManager } = useAuth();
  const [fullStatsData, setFullStatsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(7, 'day'),
    dayjs()
  ]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [workplaces, setWorkplaces] = useState([]);
  
  // Модальные окна
  const [isManualCheckInModalVisible, setIsManualCheckInModalVisible] = useState(false);
  const [isManualCheckOutModalVisible, setIsManualCheckOutModalVisible] = useState(false);
  const [isAbsenceReasonModalVisible, setIsAbsenceReasonModalVisible] = useState(false);
  const [selectedAbsenceRecord, setSelectedAbsenceRecord] = useState(null);
  
  // Формы
  const [manualCheckInForm] = Form.useForm();
  const [manualCheckOutForm] = Form.useForm();
  const [absenceReasonForm] = Form.useForm();

  // Загрузка данных
  useEffect(() => {
    fetchFullStats();
    if (isManager) {
      fetchUsers();
      fetchWorkplaces();
    } else {
      // Для сотрудников устанавливаем себя как выбранного пользователя
      setSelectedUser(user.id);
    }
  }, [isManager, user.id]);

  const fetchFullStats = async (startDate = null, endDate = null) => {
    try {
      setLoading(true);
      console.log('Fetching full stats...');
      
      const params = {};
      if (startDate && endDate) {
        params.startDate = startDate.format('YYYY-MM-DD');
        params.endDate = endDate.format('YYYY-MM-DD');
      }
      
      // Для сотрудников загружаем только их данные
      if (!isManager) {
        params.userId = user.id;
      }
      
      const response = await api.get('/attendance/full-stats-30-days', { params });
      console.log('Full stats response:', response.data);
      setFullStatsData(response.data);
      console.log('fullStatsData state updated:', response.data);
    } catch (error) {
      console.error('Error fetching full stats:', error);
      console.error('Error details:', error.response?.data);
      message.error('Ошибка загрузки статистики');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      console.log('Fetching users...');
      const response = await api.get('/users', { params: { limit: 1000 } });
      console.log('Users response:', response.data);
      const usersData = Array.isArray(response.data) ? response.data : response.data.users || [];
      console.log('Setting users:', usersData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      console.error('Error details:', error.response?.data);
      setUsers([]);
    }
  };

  const fetchWorkplaces = async () => {
    try {
      console.log('Fetching workplaces...');
      const response = await api.get('/workplaces', { params: { limit: 1000 } });
      console.log('Workplaces response:', response.data);
      const workplacesData = Array.isArray(response.data) ? response.data : response.data.workplaces || [];
      console.log('Setting workplaces:', workplacesData);
      setWorkplaces(workplacesData);
    } catch (error) {
      console.error('Error fetching workplaces:', error);
      console.error('Error details:', error.response?.data);
      setWorkplaces([]);
    }
  };

  // Получение всех дней в диапазоне
  const getAllDaysData = () => {
    console.log('getAllDaysData - fullStatsData:', fullStatsData);
    
    if (!fullStatsData || !fullStatsData.days) {
      console.log('getAllDaysData - returning null (no data)');
      return [];
    }
    
    console.log('getAllDaysData - available days:', fullStatsData.days?.map(d => d.date));
    return fullStatsData.days;
  };

  // Получение данных для выбранного пользователя за период
  const getUserStats = () => {
    if (!fullStatsData || !selectedUser) {
      return null;
    }
    
    const userStats = {
      userId: selectedUser,
      totalDays: 0,
      presentDays: 0,
      lateDays: 0,
      absentDays: 0,
      sickDays: 0,
      businessTripDays: 0,
      vacationDays: 0,
      noReasonDays: 0,
      days: []
    };
    
    fullStatsData.days.forEach(day => {
      const userAttendance = day.employees.find(emp => emp.userId === selectedUser);
      if (userAttendance) {
        userStats.totalDays++;
        userStats.days.push({
          date: day.date,
          ...userAttendance
        });
        
        switch (userAttendance.status) {
          case 'present':
            userStats.presentDays++;
            break;
          case 'late':
            userStats.lateDays++;
            break;
          case 'absent':
            userStats.absentDays++;
            break;
          case 'sick':
            userStats.sickDays++;
            break;
          case 'business_trip':
            userStats.businessTripDays++;
            break;
          case 'vacation':
            userStats.vacationDays++;
            break;
          case 'no_reason':
            userStats.noReasonDays++;
            break;
        }
      }
    });
    
    return userStats;
  };

  // Получение данных для выбранного пользователя за весь период
  const getUserDataForPeriod = () => {
    if (!fullStatsData || !selectedUser) return [];
    
    const userData = [];
    fullStatsData.days.forEach(day => {
      const userAttendance = day.employees.find(emp => emp.userId === selectedUser);
      if (userAttendance) {
        userData.push({
          date: day.date,
          ...userAttendance
        });
      }
    });
    
    return userData;
  };

  // Обработчики форм
  const handleManualCheckIn = async (values) => {
    try {
      await api.post('/attendance/manual-check-in', {
        userId: values.userId,
        workplaceId: values.workplaceId,
        checkInTime: values.checkInTime.format('YYYY-MM-DD HH:mm:ss'),
        notes: values.notes
      });
      
      message.success('Приход отмечен');
      setIsManualCheckInModalVisible(false);
      manualCheckInForm.resetFields();
      fetchFullStats();
    } catch (error) {
      console.error('Error marking check-in:', error);
      message.error('Ошибка при отметке прихода');
    }
  };

  const handleManualCheckOut = async (values) => {
    try {
      await api.post('/attendance/manual-check-out', {
        userId: values.userId,
        workplaceId: values.workplaceId,
        checkOutTime: values.checkOutTime.format('YYYY-MM-DD HH:mm:ss'),
        notes: values.notes
      });
      
      message.success('Уход отмечен');
      setIsManualCheckOutModalVisible(false);
      manualCheckOutForm.resetFields();
      fetchFullStats();
    } catch (error) {
      console.error('Error marking check-out:', error);
      message.error('Ошибка при отметке ухода');
    }
  };

  const handleUpdateAbsenceReason = async (values) => {
    try {
      await api.put('/attendance/update-absence-reason', {
        userId: selectedAbsenceRecord.userId,
        date: dayjs().format('YYYY-MM-DD'),
        reason: values.reason,
        notes: values.notes
      });
      
      message.success('Причина отсутствия обновлена');
      setIsAbsenceReasonModalVisible(false);
      absenceReasonForm.resetFields();
      setSelectedAbsenceRecord(null);
      fetchFullStats();
    } catch (error) {
      console.error('Error updating absence reason:', error);
      message.error('Ошибка при обновлении причины отсутствия');
    }
  };

  // Экспорт в Excel
  const handleExportExcel = async () => {
    try {
      const response = await api.get('/attendance/export-excel', {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Посещения_${dayjs().subtract(30, 'day').format('YYYY-MM-DD')}_${dayjs().format('YYYY-MM-DD')}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      message.success('Файл экспортирован');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      message.error('Ошибка при экспорте в Excel');
    }
  };

  // Получение статуса с цветом
  const getStatusTag = (status) => {
    const statusConfig = {
      'present': { color: 'green', text: 'Присутствовал' },
      'late': { color: 'orange', text: 'Опоздал' },
      'absent': { color: 'red', text: 'Отсутствовал' },
      'sick': { color: 'purple', text: 'Болезнь' },
      'business_trip': { color: 'blue', text: 'Командировка' },
      'vacation': { color: 'cyan', text: 'Отпуск' },
      'no_reason': { color: 'red', text: 'Без причины' }
    };
    
    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // Колонки для таблицы
  const columns = [
    {
      title: 'Сотрудник',
      dataIndex: 'user',
      key: 'user',
      render: (user) => `${user.lastName} ${user.firstName}`,
      sorter: (a, b) => `${a.user.lastName} ${a.user.firstName}`.localeCompare(`${b.user.lastName} ${b.user.firstName}`)
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
      filters: [
        { text: 'Присутствовал', value: 'present' },
        { text: 'Опоздал', value: 'late' },
        { text: 'Отсутствовал', value: 'absent' },
        { text: 'Болезнь', value: 'sick' },
        { text: 'Командировка', value: 'business_trip' },
        { text: 'Отпуск', value: 'vacation' },
        { text: 'Без причины', value: 'no_reason' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: 'Время прихода',
      dataIndex: 'checkInTime',
      key: 'checkInTime',
      render: (time) => time ? dayjs(time).format('HH:mm') : '-',
      sorter: (a, b) => {
        if (!a.checkInTime && !b.checkInTime) return 0;
        if (!a.checkInTime) return 1;
        if (!b.checkInTime) return -1;
        return new Date(a.checkInTime) - new Date(b.checkInTime);
      }
    },
    {
      title: 'Время ухода',
      dataIndex: 'checkOutTime',
      key: 'checkOutTime',
      render: (time) => time ? dayjs(time).format('HH:mm') : '-',
      sorter: (a, b) => {
        if (!a.checkOutTime && !b.checkOutTime) return 0;
        if (!a.checkOutTime) return 1;
        if (!b.checkOutTime) return -1;
        return new Date(a.checkOutTime) - new Date(b.checkOutTime);
      }
    },
    {
      title: 'Место работы',
      dataIndex: 'workplace',
      key: 'workplace',
      render: (workplace) => workplace ? workplace.name : '-'
    },
    {
      title: 'Примечания',
      dataIndex: 'notes',
      key: 'notes',
      render: (notes) => notes || '-'
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {isManager && record.status === 'absent' && (
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => {
                setSelectedAbsenceRecord(record);
                setIsAbsenceReasonModalVisible(true);
              }}
            >
              Указать причину
            </Button>
          )}
        </Space>
      )
    }
  ];

  const allDaysData = getAllDaysData();
  const userDataForPeriod = getUserDataForPeriod();
  
  console.log('Render - fullStatsData:', fullStatsData);
  console.log('Render - allDaysData:', allDaysData);
  console.log('Render - userDataForPeriod:', userDataForPeriod);
  console.log('Render - users:', users);
  console.log('Render - workplaces:', workplaces);

  return (
    <div>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Title level={3}>Посещения за 30 дней</Title>
          </Col>
          <Col>
            <Space>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExportExcel}
                disabled={!isManager}
              >
                Экспорт в Excel
              </Button>
              {isManager && (
                <>
                  <Button
                    type="default"
                    icon={<PlusOutlined />}
                    onClick={() => setIsManualCheckInModalVisible(true)}
                  >
                    Отметить приход
                  </Button>
                  <Button
                    type="default"
                    icon={<EditOutlined />}
                    onClick={() => setIsManualCheckOutModalVisible(true)}
                  >
                    Отметить уход
                  </Button>
                </>
              )}
            </Space>
          </Col>
        </Row>

        {/* Фильтры */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates) {
                  setDateRange(dates);
                  fetchFullStats(dates[0], dates[1]);
                }
              }}
              format="YYYY-MM-DD"
              style={{ width: '100%' }}
              placeholder={['Начальная дата', 'Конечная дата']}
            />
          </Col>
          {isManager && (
            <Col span={6}>
              <Select
                value={selectedUser}
                onChange={setSelectedUser}
                placeholder="Выберите сотрудника"
                style={{ width: '100%' }}
                allowClear
              >
                {users.map(user => (
                  <Option key={user.id} value={user.id}>
                    {user.lastName} {user.firstName}
                  </Option>
                ))}
              </Select>
            </Col>
          )}
          <Col span={6}>
            <Button onClick={() => fetchFullStats(dateRange[0], dateRange[1])} loading={loading}>
              Обновить
            </Button>
          </Col>
        </Row>

        {/* Статистика за период */}
        {getAllDaysData().length > 0 && (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Statistic
                title="Дней в периоде"
                value={getAllDaysData().length}
                prefix={<CalendarOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Всего записей"
                value={getAllDaysData().reduce((total, day) => total + day.employees.length, 0)}
                prefix={<UserOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Присутствовали"
                value={getAllDaysData().reduce((total, day) => 
                  total + day.employees.filter(emp => emp.status === 'present').length, 0)}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Отсутствовали"
                value={getAllDaysData().reduce((total, day) => 
                  total + day.employees.filter(emp => ['absent', 'sick', 'business_trip', 'vacation', 'no_reason'].includes(emp.status)).length, 0)}
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: '#cf1322' }}
              />
            </Col>
          </Row>
        )}

        {/* Статистика по выбранному пользователю */}
        {selectedUser && getUserStats() && (
          <Card style={{ marginBottom: 16 }}>
            <Title level={4}>Статистика по сотруднику</Title>
            <Row gutter={16}>
              <Col span={4}>
                <Statistic
                  title="Всего дней"
                  value={getUserStats().totalDays}
                  prefix={<CalendarOutlined />}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="Присутствовал"
                  value={getUserStats().presentDays}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="Опоздал"
                  value={getUserStats().lateDays}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="Болел"
                  value={getUserStats().sickDays}
                  prefix={<CloseCircleOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="Командировка"
                  value={getUserStats().businessTripDays}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="Отпуск"
                  value={getUserStats().vacationDays}
                  prefix={<CalendarOutlined />}
                  valueStyle={{ color: '#13c2c2' }}
                />
              </Col>
            </Row>
          </Card>
        )}

        {/* Таблица посещений по дням */}
        {getAllDaysData().map((dayData, index) => (
          <Card key={dayData.date} style={{ marginBottom: 16 }}>
            <Title level={4} style={{ marginBottom: 16 }}>
              {dayjs(dayData.date).format('DD.MM.YYYY (dddd)')}
            </Title>
            <Table
              columns={columns}
              dataSource={dayData.employees || []}
              rowKey={(record) => `${record.userId}-${dayData.date}`}
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} из ${total} записей`
              }}
              scroll={{ x: 800 }}
              size="small"
            />
          </Card>
        ))}
      </Card>

      {/* Модальное окно для отметки прихода */}
      <Modal
        title="Отметить приход"
        open={isManualCheckInModalVisible}
        onCancel={() => {
          setIsManualCheckInModalVisible(false);
          manualCheckInForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={manualCheckInForm}
          layout="vertical"
          onFinish={handleManualCheckIn}
        >
          <Form.Item
            name="userId"
            label="Сотрудник"
            rules={[{ required: true, message: 'Выберите сотрудника' }]}
          >
            <Select placeholder="Выберите сотрудника">
              {console.log('Modal 1 (check-in) users:', users)}
              {users.map(user => (
                <Option key={user.id} value={user.id}>
                  {user.lastName} {user.firstName}
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
              {workplaces.map(workplace => (
                <Option key={workplace.id} value={workplace.id}>
                  {workplace.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="checkInTime"
            label="Время прихода"
            rules={[{ required: true, message: 'Выберите время прихода' }]}
            initialValue={dayjs()}
          >
            <TimePicker
              format="HH:mm"
              style={{ width: '100%' }}
            />
          </Form.Item>
          
          <Form.Item
            name="notes"
            label="Примечания"
          >
            <Input.TextArea rows={3} placeholder="Дополнительная информация" />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Отметить приход
              </Button>
              <Button onClick={() => setIsManualCheckInModalVisible(false)}>
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно для отметки ухода */}
      <Modal
        title="Отметить уход"
        open={isManualCheckOutModalVisible}
        onCancel={() => {
          setIsManualCheckOutModalVisible(false);
          manualCheckOutForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={manualCheckOutForm}
          layout="vertical"
          onFinish={handleManualCheckOut}
        >
          <Form.Item
            name="userId"
            label="Сотрудник"
            rules={[{ required: true, message: 'Выберите сотрудника' }]}
          >
            <Select placeholder="Выберите сотрудника">
              {users.map(user => (
                <Option key={user.id} value={user.id}>
                  {user.lastName} {user.firstName}
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
              {workplaces.map(workplace => (
                <Option key={workplace.id} value={workplace.id}>
                  {workplace.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="checkOutTime"
            label="Время ухода"
            rules={[{ required: true, message: 'Выберите время ухода' }]}
            initialValue={dayjs()}
          >
            <TimePicker
              format="HH:mm"
              style={{ width: '100%' }}
            />
          </Form.Item>
          
          <Form.Item
            name="notes"
            label="Примечания"
          >
            <Input.TextArea rows={3} placeholder="Дополнительная информация" />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Отметить уход
              </Button>
              <Button onClick={() => setIsManualCheckOutModalVisible(false)}>
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно для указания причины отсутствия */}
      <Modal
        title="Указать причину отсутствия"
        open={isAbsenceReasonModalVisible}
        onCancel={() => {
          setIsAbsenceReasonModalVisible(false);
          absenceReasonForm.resetFields();
          setSelectedAbsenceRecord(null);
        }}
        footer={null}
      >
        <Form
          form={absenceReasonForm}
          layout="vertical"
          onFinish={handleUpdateAbsenceReason}
        >
          <Form.Item
            name="reason"
            label="Причина отсутствия"
            rules={[{ required: true, message: 'Выберите причину отсутствия' }]}
          >
            <Select placeholder="Выберите причину отсутствия">
              <Option value="sick">Болезнь</Option>
              <Option value="business_trip">Командировка</Option>
              <Option value="vacation">Отпуск</Option>
              <Option value="no_reason">Без причины</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="notes"
            label="Примечания"
          >
            <Input.TextArea rows={3} placeholder="Дополнительная информация" />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Сохранить
              </Button>
              <Button onClick={() => setIsAbsenceReasonModalVisible(false)}>
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Attendance;