import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button, Form, Input, Card, Typography, Divider, Select, Space } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

const Register = () => {
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    const result = await register(values);
    setLoading(false);
    
    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 500,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          borderRadius: '12px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Title level={2} style={{ color: '#1890ff', marginBottom: '8px' }}>
            ГЕРМЕС
          </Title>
          <Text type="secondary">Регистрация в личном кабинете</Text>
        </div>

        <Form
          name="register"
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item
              name="firstName"
              label="Имя"
              rules={[
                { required: true, message: 'Пожалуйста, введите имя' },
                { min: 1, max: 50, message: 'Имя должно содержать от 1 до 50 символов' }
              ]}
              style={{ width: '50%', marginRight: '8px' }}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Имя"
              />
            </Form.Item>

            <Form.Item
              name="lastName"
              label="Фамилия"
              rules={[
                { required: true, message: 'Пожалуйста, введите фамилию' },
                { min: 1, max: 50, message: 'Фамилия должна содержать от 1 до 50 символов' }
              ]}
              style={{ width: '50%', marginLeft: '8px' }}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Фамилия"
              />
            </Form.Item>
          </Space.Compact>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Пожалуйста, введите email' },
              { type: 'email', message: 'Введите корректный email' }
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="Введите email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Пароль"
            rules={[
              { required: true, message: 'Пожалуйста, введите пароль' },
              { min: 6, message: 'Пароль должен содержать минимум 6 символов' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Введите пароль"
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Подтверждение пароля"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Пожалуйста, подтвердите пароль' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Пароли не совпадают'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Подтвердите пароль"
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>

          <Form.Item
            name="role"
            label="Роль"
            initialValue="employee"
            rules={[{ required: true, message: 'Пожалуйста, выберите роль' }]}
          >
            <Select placeholder="Выберите роль">
              <Option value="employee">Сотрудник</Option>
              <Option value="manager">Руководитель</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{ height: '48px', fontSize: '16px' }}
            >
              Зарегистрироваться
            </Button>
          </Form.Item>
        </Form>

        <Divider />

        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">
            Уже есть аккаунт?{' '}
            <Link to="/login" style={{ color: '#1890ff' }}>
              Войти
            </Link>
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default Register;
