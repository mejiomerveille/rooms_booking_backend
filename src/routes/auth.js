import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import {
  register,
  login,
  logout,
  getCurrentUser,
  refreshToken
} from '../controllers/authController.js';

const router = express.Router();

router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('nom').notEmpty().withMessage('Name is required'),
    body('telephone').optional().isString()
  ],
  validate,
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validate,
  login
);

router.post('/logout', authenticate, logout);

router.get('/me', authenticate, getCurrentUser);

router.post(
  '/refresh',
  [
    body('refresh_token').notEmpty().withMessage('Refresh token is required')
  ],
  validate,
  refreshToken
);

export default router;
