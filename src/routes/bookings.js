import express from 'express';
import { body } from 'express-validator';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  cancelBooking,
  deleteBooking
} from '../controllers/bookingsController.js';

const router = express.Router();

router.get('/', authenticate, getAllBookings);

router.get('/:id', authenticate, getBookingById);

router.post(
  '/',
  authenticate,
  [
    body('room_id').notEmpty().isUUID().withMessage('Valid room ID is required'),
    body('check_in').notEmpty().isISO8601().withMessage('Valid check-in date is required'),
    body('check_out').notEmpty().isISO8601().withMessage('Valid check-out date is required'),
    body('mode_paiement').optional().isString()
  ],
  validate,
  createBooking
);

router.put(
  '/:id',
  authenticate,
  [
    body('check_in').optional().isISO8601(),
    body('check_out').optional().isISO8601(),
    body('statut').optional().isIn(['pending', 'confirmed', 'cancelled', 'completed']),
    body('mode_paiement').optional().isString()
  ],
  validate,
  updateBooking
);

router.post('/:id/cancel', authenticate, cancelBooking);

router.delete('/:id', authenticate, requireAdmin, deleteBooking);

export default router;
