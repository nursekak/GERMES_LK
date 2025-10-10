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
            message="Очко в разработке"
            description="Даня гей и в данный момент его очко разрабатывается чтобы вы могли пользоваться сайтом"
            type="info"
            showIcon
          />
        </div>
      </Card>
    </div>
  );
};

export default Attendance;
