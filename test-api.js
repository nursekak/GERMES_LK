const http = require('http');

function testAPI() {
    console.log('Тестирование API...');
    
    // Тест регистрации
    console.log('1. Тестирование регистрации...');
    const registerData = JSON.stringify({
        email: 'admin@germes.ru',
        password: 'admin123',
        firstName: 'Администратор',
        lastName: 'Системы',
        role: 'manager'
    });
    
    const registerOptions = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/register',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(registerData)
        }
    };
    
    const registerReq = http.request(registerOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            console.log('Регистрация:', data);
            
            // Тест входа
            console.log('2. Тестирование входа...');
            const loginData = JSON.stringify({
                email: 'admin@germes.ru',
                password: 'admin123'
            });
            
            const loginOptions = {
                hostname: 'localhost',
                port: 5000,
                path: '/api/auth/login',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(loginData)
                }
            };
            
            const loginReq = http.request(loginOptions, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    console.log('Вход:', data);
                });
            });
            
            loginReq.on('error', (error) => {
                console.log('Ошибка входа:', error.message);
            });
            
            loginReq.write(loginData);
            loginReq.end();
        });
    });
    
    registerReq.on('error', (error) => {
        console.log('Ошибка регистрации:', error.message);
    });
    
    registerReq.write(registerData);
    registerReq.end();
}

testAPI();