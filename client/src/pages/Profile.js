import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, Form, Input, Button, Tabs, message } from 'antd';
import { UserOutlined, LockOutlined, SaveOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const onProfileFinish = async (values) => {
    setProfileLoading(true);
    const result = await updateProfile(values);
    setProfileLoading(false);
    
    if (!result.success) {
      message.error(result.error);
    }
  };

  const onPasswordFinish = async (values) => {
    setPasswordLoading(true);
    const result = await changePassword(values.currentPassword, values.newPassword);
    setPasswordLoading(false);
    
    if (!result.success) {
      message.error(result.error);
    }
  };

  return (
    <div>
      <Card title="Профиль пользователя" style={{ marginBottom: '24px' }}>
        <Tabs defaultActiveKey="profile">
          <TabPane tab="Личная информация" key="profile">
            <Form
              layout="vertical"
              initialValues={{
                firstName: user?.firstName,
                lastName: user?.lastName,
                email: user?.email,
                role: user?.role
              }}
              onFinish={onProfileFinish}
            >
              <Form.Item
                name="firstName"
                label="Имя"
                rules={[{ required: true, message: 'Введите имя' }]}
              >
                <Input prefix={<UserOutlined />} />
              </Form.Item>

              <Form.Item
                name="lastName"
                label="Фамилия"
                rules={[{ required: true, message: 'Введите фамилию' }]}
              >
                <Input prefix={<UserOutlined />} />
              </Form.Item>

              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Введите email' },
                  { type: 'email', message: 'Некорректный email' }
                ]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="role"
                label="Роль"
              >
                <Input disabled />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={profileLoading}
                  icon={<SaveOutlined />}
                >
                  Сохранить изменения
                </Button>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab="Безопасность" key="security">
            <Form
              layout="vertical"
              onFinish={onPasswordFinish}
            >
              <Form.Item
                name="currentPassword"
                label="Текущий пароль"
                rules={[{ required: true, message: 'Введите текущий пароль' }]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>

              <Form.Item
                name="newPassword"
                label="Новый пароль"
                rules={[
                  { required: true, message: 'Введите новый пароль' },
                  { min: 6, message: 'Пароль должен содержать минимум 6 символов' }
                ]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="Подтверждение пароля"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: 'Подтвердите пароль' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Пароли не совпадают'));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={passwordLoading}
                  icon={<LockOutlined />}
                >
                  Изменить пароль
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default Profile;
