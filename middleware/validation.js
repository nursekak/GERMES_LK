const { body, validationResult } = require('express-validator');

// Middleware для обработки ошибок валидации
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Ошибки валидации',
      errors: errors.array()
    });
  }
  next();
};

// Валидация для регистрации пользователя
const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Некорректный email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Пароль должен содержать минимум 6 символов'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Имя должно содержать от 1 до 50 символов'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Фамилия должна содержать от 1 до 50 символов'),
  body('role')
    .optional()
    .isIn(['manager', 'employee'])
    .withMessage('Некорректная роль'),
  handleValidationErrors
];

// Валидация для входа
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Некорректный email'),
  body('password')
    .notEmpty()
    .withMessage('Пароль обязателен'),
  handleValidationErrors
];

// Валидация для создания места работы
const validateWorkplace = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Название должно содержать от 1 до 100 символов'),
  body('address')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Адрес обязателен'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Описание не должно превышать 500 символов'),
  handleValidationErrors
];

// Валидация для ручной отметки присутствия
const validateManualCheckIn = [
  body('userId')
    .isUUID()
    .withMessage('Некорректный ID пользователя'),
  body('workplaceId')
    .isUUID()
    .withMessage('Некорректный ID места работы'),
  body('checkInTime')
    .optional()
    .isISO8601()
    .withMessage('Некорректный формат времени'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Комментарий не должен превышать 500 символов'),
  handleValidationErrors
];

// Валидация для ручной отметки ухода
const validateManualCheckOut = [
  body('userId')
    .isUUID()
    .withMessage('Некорректный ID пользователя'),
  body('checkOutTime')
    .optional()
    .isISO8601()
    .withMessage('Некорректный формат времени'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Комментарий не должен превышать 500 символов'),
  handleValidationErrors
];

// Валидация для создания отчета
const validateReport = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Заголовок должен содержать от 1 до 200 символов'),
  body('content')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Содержание отчета обязательно'),
  body('reportDate')
    .isISO8601()
    .withMessage('Некорректная дата отчета'),
  handleValidationErrors
];

// Валидация для обновления пароля
const validatePasswordUpdate = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Текущий пароль обязателен'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Новый пароль должен содержать минимум 6 символов'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateLogin,
  validateWorkplace,
  validateReport,
  validatePasswordUpdate,
  validateManualCheckIn,
  validateManualCheckOut
};
