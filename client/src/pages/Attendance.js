import React from 'react';
import { Card, Typography, Alert } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';

const { Title } = Typography;

const Attendance = () => {
  return (
    <div>
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <ClockCircleOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
          <Title level={3}>Посещения</Title>
          <Alert
            message="Функция в разработке"
            description="Страница просмотра посещений будет доступна в следующей версии"
            type="info"
            showIcon
          />
        </div>
      </Card>
    </div>
  );
};

export default Attendance;
