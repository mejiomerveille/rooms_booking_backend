import express from 'express';
import { body } from 'express-validator';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  addRoomPhoto,
  deleteRoomPhoto,
  checkRoomAvailability
} from '../controllers/roomsController.js';

const router = express.Router();

router.get('/', getAllRooms);

router.get('/:id', getRoomById);

router.get('/:roomId/availability', checkRoomAvailability);

router.post(
  '/',
  authenticate,
  requireAdmin,
  [
    body('numero').notEmpty().withMessage('Room number is required'),
    body('type').notEmpty().withMessage('Room type is required'),
    body('capacite').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
    body('prix').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('description').optional().isString(),
    body('equipements').optional().isArray(),
    body('statut').optional().isIn(['available', 'occupied', 'maintenance'])
  ],
  validate,
  createRoom
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  [
    body('numero').optional().notEmpty(),
    body('type').optional().notEmpty(),
    body('capacite').optional().isInt({ min: 1 }),
    body('prix').optional().isFloat({ min: 0 }),
    body('description').optional().isString(),
    body('equipements').optional().isArray(),
    body('statut').optional().isIn(['available', 'occupied', 'maintenance'])
  ],
  validate,
  updateRoom
);

router.delete('/:id', authenticate, requireAdmin, deleteRoom);

router.post(
  '/:roomId/photos',
  authenticate,
  requireAdmin,
  [
    body('url').notEmpty().isURL().withMessage('Valid photo URL is required'),
    body('ordre').optional().isInt({ min: 0 })
  ],
  validate,
  addRoomPhoto
);

router.delete('/:roomId/photos/:photoId', authenticate, requireAdmin, deleteRoomPhoto);

export default router;
