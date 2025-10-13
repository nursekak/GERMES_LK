import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  DatePicker, 
  Select, 
  message, 
  Space, 
  Typography,
  Tag,
  Tooltip,
  Popconfirm,
  Row,
  Col
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  FileTextOutlined,
  CheckOutlined,
  CloseOutlined,
  DownloadOutlined,
  EyeOutlined,
  MessageOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const Reports = () => {
  const { user, isManager } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [viewingReport, setViewingReport] = useState(null);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedReportForComment, setSelectedReportForComment] = useState(null);
  const [comment, setComment] = useState('');
  const [form] = Form.useForm();

  // Загрузка отчетов
  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = isManager 
        ? await api.get('/reports/all')
        : await api.get('/reports/my-reports');
      setReports(response.data.reports);
    } catch (error) {
      message.error('Ошибка загрузки отчетов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Создание/обновление отчета
  const handleSubmit = async (values) => {
    try {
      if (editingReport) {
        await api.put(`/reports/${editingReport.id}`, values);
        message.success('Отчет обновлен');
      } else {
        await api.post('/reports', values);
        message.success('Отчет создан');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingReport(null);
      fetchReports();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Ошибка сохранения отчета';
      message.error(errorMessage);
    }
  };

  // Удаление отчета
  const handleDelete = async (reportId) => {
    try {
      await api.delete(`/reports/${reportId}`);
      message.success('Отчет удален');
      fetchReports();
    } catch (error) {
      message.error('Ошибка удаления отчета');
    }
  };

  // Отправка отчета на утверждение
  const handleSubmitForApproval = async (reportId) => {
    try {
      await api.post(`/reports/${reportId}/submit`);
      message.success('Отчет отправлен на утверждение');
      fetchReports();
    } catch (error) {
      message.error('Ошибка отправки отчета');
    }
  };

  // Утверждение/отклонение отчета (только для руководителей)
  const handleApprove = async (reportId, status) => {
    try {
      await api.patch(`/reports/${reportId}/approve`, { status });
      message.success(status === 'approved' ? 'Отчет утвержден' : 'Отчет отклонен');
      fetchReports();
    } catch (error) {
      message.error('Ошибка обработки отчета');
    }
  };

  // Просмотр отчета
  const handleView = (report) => {
    setViewingReport(report);
    setViewModalVisible(true);
  };

  // Редактирование отчета
  const handleEdit = (report) => {
    setEditingReport(report);
    form.setFieldsValue({
      title: report.title,
      content: report.content,
      reportDate: dayjs(report.reportDate)
    });
    setModalVisible(true);
  };

  // Создание отчета
  const handleCreate = () => {
    setEditingReport(null);
    form.resetFields();
    form.setFieldsValue({
      reportDate: dayjs()
    });
    setModalVisible(true);
  };

  // Экспорт отчетов
  const handleExport = async () => {
    try {
      const response = await api.get('/reports/export/csv', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reports_${dayjs().format('YYYY-MM-DD')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      message.success('Отчеты экспортированы');
    } catch (error) {
      message.error('Ошибка экспорта отчетов');
    }
  };

  // Функции для работы с комментариями
  const handleAddComment = (report) => {
    setSelectedReportForComment(report);
    setComment('');
    setCommentModalVisible(true);
  };

  const handleSubmitComment = async () => {
    try {
      await api.patch(`/reports/${selectedReportForComment.id}/comment`, {
        comment: comment
      });
      message.success('Комментарий добавлен');
      setCommentModalVisible(false);
      setComment('');
      fetchReports(); // Обновляем список отчетов
    } catch (error) {
      console.error('Error adding comment:', error);
      message.error('Ошибка при добавлении комментария');
    }
  };

  const getStatusTag = (status) => {
    const statusConfig = {
      draft: { color: 'default', text: 'Черновик' },
      submitted: { color: 'processing', text: 'На рассмотрении' },
      approved: { color: 'success', text: 'Утвержден' },
      rejected: { color: 'error', text: 'Отклонен' }
    };
    const config = statusConfig[status] || statusConfig.draft;
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: 'Заголовок',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Дата отчета',
      dataIndex: 'reportDate',
      key: 'reportDate',
      render: (date) => dayjs(date).format('DD.MM.YYYY'),
      sorter: (a, b) => new Date(a.reportDate) - new Date(b.reportDate),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: getStatusTag,
    },
    ...(isManager ? [{
      title: 'Автор',
      dataIndex: 'user',
      key: 'user',
      render: (user) => user ? `${user.firstName} ${user.lastName}` : '-',
    }] : []),
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Просмотр">
            <Button 
              type="primary" 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title="Комментарий">
            <Button 
              icon={<MessageOutlined />} 
              size="small"
              onClick={() => handleAddComment(record)}
            />
          </Tooltip>
          {record.status === 'draft' && (
            <Tooltip title="Редактировать">
              <Button 
                icon={<EditOutlined />} 
                size="small"
                onClick={() => handleEdit(record)}
              />
            </Tooltip>
          )}
          {record.status === 'draft' && (
            <Tooltip title="Отправить на утверждение">
              <Button 
                type="primary" 
                size="small"
                onClick={() => handleSubmitForApproval(record.id)}
              >
                Отправить
              </Button>
            </Tooltip>
          )}
          {isManager && record.status === 'submitted' && (
            <>
              <Tooltip title="Утвердить">
                <Button 
                  type="primary" 
                  icon={<CheckOutlined />} 
                  size="small"
                  onClick={() => handleApprove(record.id, 'approved')}
                />
              </Tooltip>
              <Tooltip title="Отклонить">
                <Button 
                  danger 
                  icon={<CloseOutlined />} 
                  size="small"
                  onClick={() => handleApprove(record.id, 'rejected')}
                />
              </Tooltip>
            </>
          )}
          {record.status === 'draft' && (
            <Popconfirm
              title="Удалить отчет?"
              description="Это действие нельзя отменить"
              onConfirm={() => handleDelete(record.id)}
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
          )}
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
            <FileTextOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <Title level={3} style={{ margin: 0 }}>Отчеты</Title>
          </div>
          <Space>
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              onClick={handleExport}
            >
              Экспорт
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleCreate}
            >
              Создать отчет
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={reports}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} из ${total} отчетов`,
          }}
        />
      </Card>

      {/* Модальное окно для создания/редактирования */}
      <Modal
        title={editingReport ? 'Редактировать отчет' : 'Создать отчет'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingReport(null);
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="title"
            label="Заголовок"
            rules={[{ required: true, message: 'Введите заголовок отчета' }]}
          >
            <Input placeholder="Введите заголовок отчета" />
          </Form.Item>

          <Form.Item
            name="reportDate"
            label="Дата отчета"
            rules={[{ required: true, message: 'Выберите дату отчета' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="content"
            label="Содержание"
            rules={[{ required: true, message: 'Введите содержание отчета' }]}
          >
            <TextArea 
              placeholder="Введите содержание отчета" 
              rows={8}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                Отмена
              </Button>
              <Button type="primary" htmlType="submit">
                {editingReport ? 'Обновить' : 'Создать'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно для просмотра отчета */}
      <Modal
        title="Просмотр отчета"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Закрыть
          </Button>
        ]}
        width={800}
      >
        {viewingReport && (
          <div>
            <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
              <Col span={12}>
                <strong>Заголовок:</strong> {viewingReport.title}
              </Col>
              <Col span={12}>
                <strong>Дата:</strong> {dayjs(viewingReport.reportDate).format('DD.MM.YYYY')}
              </Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
              <Col span={12}>
                <strong>Статус:</strong> {getStatusTag(viewingReport.status)}
              </Col>
              {viewingReport.approver && (
                <Col span={12}>
                  <strong>Утвердил:</strong> {viewingReport.approver.firstName} {viewingReport.approver.lastName}
                </Col>
              )}
            </Row>
            <div>
              <strong>Содержание:</strong>
              <div style={{ 
                marginTop: '8px', 
                padding: '16px', 
                background: '#f5f5f5', 
                borderRadius: '6px',
                whiteSpace: 'pre-wrap'
              }}>
                {viewingReport.content}
              </div>
            </div>
            {viewingReport.comments && (
              <div style={{ marginTop: '16px' }}>
                <strong>Комментарии:</strong>
                <div style={{ 
                  marginTop: '8px', 
                  padding: '16px', 
                  background: '#f0f0f0', 
                  borderRadius: '6px'
                }}>
                  {viewingReport.comments}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Модальное окно для добавления комментария */}
      <Modal
        title="Добавить комментарий к отчету"
        open={commentModalVisible}
        onCancel={() => setCommentModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setCommentModalVisible(false)}>
            Отмена
          </Button>,
          <Button key="submit" type="primary" onClick={handleSubmitComment}>
            Добавить комментарий
          </Button>
        ]}
      >
        {selectedReportForComment && (
          <div>
            <h4>{selectedReportForComment.title}</h4>
            <p><strong>Автор:</strong> {selectedReportForComment.user?.firstName} {selectedReportForComment.user?.lastName}</p>
            <p><strong>Статус:</strong> {
              selectedReportForComment.status === 'approved' ? 'Утвержден' :
              selectedReportForComment.status === 'rejected' ? 'Отклонен' :
              selectedReportForComment.status === 'submitted' ? 'На рассмотрении' : 'Черновик'
            }</p>
            
            {selectedReportForComment.comments && (
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
                  {selectedReportForComment.comments}
                </div>
              </div>
            )}
            
            <div style={{ marginTop: '16px' }}>
              <label>Ваш комментарий:</label>
              <TextArea
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

export default Reports;
