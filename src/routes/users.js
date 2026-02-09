import express from 'express';
import { body } from 'express-validator';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getProfile,
  updateProfile
} from '../controllers/usersController.js';

const router = express.Router();

router.get('/profile', authenticate, getProfile);

router.put(
  '/profile',
  authenticate,
  [
    body('nom').optional().notEmpty(),
    body('telephone').optional().isString(),
    body('email').optional().isEmail()
  ],
  validate,
  updateProfile
);

router.get('/', authenticate, requireAdmin, getAllUsers);

router.get('/:id', authenticate, getUserById);

router.put(
  '/:id',
  authenticate,
  [
    body('nom').optional().notEmpty(),
    body('telephone').optional().isString(),
    body('email').optional().isEmail(),
    body('role').optional().isIn(['admin', 'client'])
  ],
  validate,
  updateUser
);

router.delete('/:id', authenticate, requireAdmin, deleteUser);

export default router;
