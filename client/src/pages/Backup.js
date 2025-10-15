import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  message, 
  Space, 
  Typography,
  Tag,
  Tooltip,
  Popconfirm,
  Alert,
  Row,
  Col,
  Statistic
} from 'antd';
import { 
  DatabaseOutlined, 
  DownloadOutlined, 
  DeleteOutlined, 
  ReloadOutlined,
  CloudDownloadOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import dayjs from 'dayjs';

const { Title } = Typography;

const Backup = () => {
  const { user, isManager } = useAuth();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(null);
  const [stats, setStats] = useState({});

  // Загрузка списка резервных копий
  const fetchBackups = async () => {
    setLoading(true);
    try {
      const response = await api.get('/backup/list');
      setBackups(response.data.backups);
    } catch (error) {
      message.error('Ошибка загрузки резервных копий');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка статистики
  const fetchStats = async () => {
    try {
      const response = await api.get('/backup/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  };

  useEffect(() => {
    fetchBackups();
    fetchStats();
  }, []);

  // Создание резервной копии
  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      await api.post('/backup/create');
      message.success('Резервная копия создана');
      fetchBackups();
      fetchStats();
    } catch (error) {
      message.error('Ошибка создания резервной копии');
    } finally {
      setCreating(false);
    }
  };

  // Скачивание резервной копии
  const handleDownload = async (fileName) => {
    try {
      const response = await api.get(`/backup/download/${fileName}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      message.success('Резервная копия скачана');
    } catch (error) {
      message.error('Ошибка скачивания резервной копии');
    }
  };

  // Восстановление из резервной копии
  const handleRestore = async (fileName) => {
    setRestoring(fileName);
    try {
      await api.post(`/backup/restore/${fileName}`);
      message.success('База данных восстановлена из резервной копии');
    } catch (error) {
      message.error('Ошибка восстановления базы данных');
    } finally {
      setRestoring(null);
    }
  };

  // Удаление резервной копии
  const handleDelete = async (fileName) => {
    try {
      await api.delete(`/backup/${fileName}`);
      message.success('Резервная копия удалена');
      fetchBackups();
      fetchStats();
    } catch (error) {
      message.error('Ошибка удаления резервной копии');
    }
  };

  // Форматирование размера файла
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const columns = [
    {
      title: 'Имя файла',
      dataIndex: 'fileName',
      key: 'fileName',
      render: (fileName) => (
        <span style={{ fontFamily: 'monospace' }}>{fileName}</span>
      ),
    },
    {
      title: 'Размер',
      dataIndex: 'size',
      key: 'size',
      render: (size) => formatFileSize(size),
      sorter: (a, b) => a.size - b.size,
    },
    {
      title: 'Дата создания',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('DD.MM.YYYY HH:mm'),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'completed' ? 'green' : 'orange'}>
          {status === 'completed' ? 'Готов' : 'Создается'}
        </Tag>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Скачать">
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              size="small"
              onClick={() => handleDownload(record.fileName)}
            />
          </Tooltip>
          <Popconfirm
            title="Восстановить из этой копии?"
            description="Это действие перезапишет текущую базу данных. Продолжить?"
            onConfirm={() => handleRestore(record.fileName)}
            okText="Да"
            cancelText="Нет"
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
          >
            <Tooltip title="Восстановить">
              <Button 
                icon={<ReloadOutlined />} 
                size="small"
                loading={restoring === record.fileName}
              />
            </Tooltip>
          </Popconfirm>
          <Popconfirm
            title="Удалить резервную копию?"
            description="Это действие нельзя отменить"
            onConfirm={() => handleDelete(record.fileName)}
            okText="Да"
            cancelText="Нет"
          >
            <Tooltip title="Удалить">
              <Button 
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
            <DatabaseOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <Title level={3} style={{ margin: 0 }}>Резервные копии</Title>
          </div>
          <Button 
            type="primary" 
            icon={<CloudDownloadOutlined />} 
            onClick={handleCreateBackup}
            loading={creating}
          >
            Создать копию
          </Button>
        </div>

        {/* Предупреждение о восстановлении */}
        <Alert
          message="Внимание!"
          description="Восстановление из резервной копии полностью заменит текущую базу данных. Убедитесь, что у вас есть актуальная резервная копия перед восстановлением."
          type="warning"
          showIcon
          style={{ marginBottom: '24px' }}
        />

        {/* Статистика */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Всего копий"
                value={stats.totalBackups || 0}
                prefix={<DatabaseOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Общий размер"
                value={formatFileSize(stats.totalSize || 0)}
                prefix={<CloudDownloadOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Последняя копия"
                value={stats.lastBackup ? dayjs(stats.lastBackup).format('DD.MM.YYYY') : 'Никогда'}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* Таблица резервных копий */}
        <Table
          columns={columns}
          dataSource={backups}
          loading={loading}
          rowKey="fileName"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} из ${total} копий`,
          }}
        />
      </Card>
    </div>
  );
};

export default Backup;
