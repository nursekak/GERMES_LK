import React from 'react';
import { Card, Typography, Alert } from 'antd';
import { TeamOutlined } from '@ant-design/icons';

const { Title } = Typography;

const Users = () => {
  return (
    <div>
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <TeamOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
          <Title level={3}>Управление сотрудниками</Title>
          <Alert
            message="Функция в разработке"
            description="Страница управления сотрудниками будет доступна в следующей версии"
            type="info"
            showIcon
          />
        </div>
      </Card>
    </div>
  );
};

export default Users;
