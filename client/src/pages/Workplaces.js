import React from 'react';
import { Card, Typography, Alert } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';

const { Title } = Typography;

const Workplaces = () => {
  return (
    <div>
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <EnvironmentOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
          <Title level={3}>Места работы</Title>
          <Alert
            message="Функция в разработке"
            description="Страница управления местами работы будет доступна в следующей версии"
            type="info"
            showIcon
          />
        </div>
      </Card>
    </div>
  );
};

export default Workplaces;
