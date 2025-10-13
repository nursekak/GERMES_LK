import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Switch, 
  message, 
  Popconfirm, 
  Space, 
  Typography,
  Tag,
  Tooltip,
  QRCode
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  QrcodeOutlined,
  EnvironmentOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

const { Title } = Typography;
const { TextArea } = Input;

const Workplaces = () => {
  const { user } = useAuth();
  const [workplaces, setWorkplaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [editingWorkplace, setEditingWorkplace] = useState(null);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [form] = Form.useForm();

  // Загрузка списка мест работы
  const fetchWorkplaces = async () => {
    setLoading(true);
    try {
      const response = await api.get('/workplaces');
      setWorkplaces(response.data.workplaces);
    } catch (error) {
      message.error('Ошибка загрузки мест работы');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkplaces();
  }, []);

  // Создание/обновление места работы
  const handleSubmit = async (values) => {
    try {
      if (editingWorkplace) {
        await api.put(`/workplaces/${editingWorkplace.id}`, values);
        message.success('Место работы обновлено');
      } else {
        await api.post('/workplaces', values);
        message.success('Место работы создано');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingWorkplace(null);
      fetchWorkplaces();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Ошибка сохранения места работы';
      message.error(errorMessage);
    }
  };

  // Удаление места работы
  const handleDelete = async (workplaceId) => {
    try {
      await api.delete(`/workplaces/${workplaceId}`);
      message.success('Место работы удалено');
      fetchWorkplaces();
    } catch (error) {
      message.error('Ошибка удаления места работы');
    }
  };

  // Генерация нового QR кода
  const handleRegenerateQR = async (workplaceId) => {
    try {
      const response = await api.post(`/workplaces/${workplaceId}/regenerate-qr`);
      message.success('QR код обновлен');
      fetchWorkplaces();
    } catch (error) {
      message.error('Ошибка генерации QR кода');
    }
  };

  // Показать QR код
  const handleShowQR = async (workplace) => {
    try {
      const response = await api.get(`/attendance/qr/${workplace.id}`);
      setQrCodeData({
        qrCode: response.data.qrCode,
        workplace: response.data.workplace
      });
      setQrModalVisible(true);
    } catch (error) {
      message.error('Ошибка загрузки QR кода');
    }
  };

  // Открытие модального окна для редактирования
  const handleEdit = (workplace) => {
    setEditingWorkplace(workplace);
    form.setFieldsValue({
      name: workplace.name,
      address: workplace.address,
      description: workplace.description,
      isActive: workplace.isActive
    });
    setModalVisible(true);
  };

  // Открытие модального окна для создания
  const handleCreate = () => {
    setEditingWorkplace(null);
    form.resetFields();
    setModalVisible(true);
  };

  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Адрес',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
    },
    {
      title: 'Статус',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Активно' : 'Неактивно'}
        </Tag>
      ),
    },
    {
      title: 'QR код',
      key: 'qrCode',
      render: (_, record) => (
        <Space>
          <Tooltip title="Показать QR код">
            <Button 
              type="primary" 
              icon={<QrcodeOutlined />} 
              size="small"
              onClick={() => handleShowQR(record)}
            />
          </Tooltip>
          <Tooltip title="Обновить QR код">
            <Button 
              icon={<ReloadOutlined />} 
              size="small"
              onClick={() => handleRegenerateQR(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Редактировать">
            <Button 
              type="primary" 
              icon={<EditOutlined />} 
              size="small"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Удалить место работы?"
            description="Это действие нельзя отменить"
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Tooltip title="Удалить">
              <Button 
                type="primary" 
                danger 
                icon={<DeleteOutlined />} 
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
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
            <EnvironmentOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <Title level={3} style={{ margin: 0 }}>Места работы</Title>
          </div>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleCreate}
          >
            Добавить место работы
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={workplaces}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} из ${total} мест работы`,
          }}
        />
      </Card>

      {/* Модальное окно для создания/редактирования */}
      <Modal
        title={editingWorkplace ? 'Редактировать место работы' : 'Добавить место работы'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingWorkplace(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название места работы' }]}
          >
            <Input placeholder="Введите название места работы" />
          </Form.Item>

          <Form.Item
            name="address"
            label="Адрес"
            rules={[{ required: true, message: 'Введите адрес' }]}
          >
            <TextArea 
              placeholder="Введите адрес места работы" 
              rows={3}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <TextArea 
              placeholder="Введите описание места работы (необязательно)" 
              rows={3}
            />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Статус"
            valuePropName="checked"
          >
            <Switch 
              checkedChildren="Активно" 
              unCheckedChildren="Неактивно" 
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                Отмена
              </Button>
              <Button type="primary" htmlType="submit">
                {editingWorkplace ? 'Обновить' : 'Создать'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно для отображения QR кода */}
      <Modal
        title="QR код места работы"
        open={qrModalVisible}
        onCancel={() => setQrModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setQrModalVisible(false)}>
            Закрыть
          </Button>
        ]}
        width={400}
        centered
      >
        {qrCodeData && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '16px' }}>
              <Title level={4}>{qrCodeData.workplace.name}</Title>
              <p style={{ color: '#666', margin: '8px 0' }}>
                {qrCodeData.workplace.address}
              </p>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              marginBottom: '16px' 
            }}>
              <QRCode 
                value={qrCodeData.workplace.qrCode} 
                size={200}
                style={{ border: '1px solid #d9d9d9', borderRadius: '8px' }}
          />
        </div>
            <p style={{ color: '#666', fontSize: '12px' }}>
              Отсканируйте QR код для регистрации явки на работу
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Workplaces;
