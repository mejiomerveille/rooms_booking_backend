import pool from '../config/db.js';

import { v4 as uuidv4 } from 'uuid';

/* =========================
   GET ALL ROOMS
========================= */
export const getAllRooms = async (req, res) => {
  try {
    const { type, statut, minPrice, maxPrice, capacite } = req.query;

    let conditions = [];
    let values = [];
    let i = 1;

    if (type) {
      conditions.push(`type = $${i++}`);
      values.push(type);
    }
    if (statut) {
      conditions.push(`statut = $${i++}`);
      values.push(statut);
    }
    if (minPrice) {
      conditions.push(`prix >= $${i++}`);
      values.push(minPrice);
    }
    if (maxPrice) {
      conditions.push(`prix <= $${i++}`);
      values.push(maxPrice);
    }
    if (capacite) {
      conditions.push(`capacite >= $${i++}`);
      values.push(capacite);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const query = `
      SELECT r.*,
        COALESCE(
          json_agg(
            json_build_object('id', p.id, 'url', p.url, 'ordre', p.ordre)
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) AS room_photos
      FROM rooms r
      LEFT JOIN room_photos p ON p.room_id = r.id
      ${whereClause}
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `;

    const { rows } = await pool.query(query, values);
    res.status(200).json({ data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
};

/* =========================
   GET ROOM BY ID
========================= */
export const getRoomById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT r.*,
        COALESCE(
          json_agg(
            json_build_object('id', p.id, 'url', p.url, 'ordre', p.ordre)
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) AS room_photos
      FROM rooms r
      LEFT JOIN room_photos p ON p.room_id = r.id
      WHERE r.id = $1
      GROUP BY r.id
    `;

    const { rows } = await pool.query(query, [id]);

    if (!rows[0]) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.status(200).json({ data: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
};

/* =========================
   CREATE ROOM (ADMIN)
========================= */
export const createRoom = async (req, res) => {
  try {
    const { numero, type, capacite, prix, description, equipements, statut } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO rooms
        (id, numero, type, capacite, prix, description, equipements, statut)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        uuidv4(),
        numero,
        type,
        capacite,
        prix,
        description,
        equipements || [],
        statut || 'available'
      ]
    );

    res.status(201).json({ data: rows[0] });
  } catch (error) {
    console.error(error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Room number already exists' });
    }
    res.status(500).json({ error: 'Failed to create room' });
  }
};

/* =========================
   UPDATE ROOM (ADMIN)
========================= */
export const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = [];
    const values = [];
    let i = 1;

    for (const key of [
      'numero',
      'type',
      'capacite',
      'prix',
      'description',
      'equipements',
      'statut'
    ]) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = $${i++}`);
        values.push(req.body[key]);
      }
    }

    if (!fields.length) {
      return res.status(400).json({ error: 'No data to update' });
    }

    values.push(id);

    const query = `
      UPDATE rooms
      SET ${fields.join(', ')}
      WHERE id = $${i}
      RETURNING *
    `;

    const { rows } = await pool.query(query, values);

    if (!rows[0]) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.status(200).json({ data: rows[0] });
  } catch (error) {
    console.error(error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Room number already exists' });
    }
    res.status(500).json({ error: 'Failed to update room' });
  }
};

/* =========================
   DELETE ROOM (ADMIN)
========================= */
export const deleteRoom = async (req, res) => {
  try {
    await pool.query('DELETE FROM rooms WHERE id = $1', [req.params.id]);
    res.status(200).json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete room' });
  }
};

/* =========================
   ADD ROOM PHOTO
========================= */
export const addRoomPhoto = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { url, ordre } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO room_photos (id, room_id, url, ordre)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [uuidv4(), roomId, url, ordre || 0]
    );

    res.status(201).json({ data: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add room photo' });
  }
};

/* =========================
   DELETE ROOM PHOTO
========================= */
export const deleteRoomPhoto = async (req, res) => {
  try {
    await pool.query('DELETE FROM room_photos WHERE id = $1', [
      req.params.photoId
    ]);
    res.status(200).json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
};

/* =========================
   CHECK AVAILABILITY
========================= */
export const checkRoomAvailability = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { checkIn, checkOut } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({ error: 'Dates required' });
    }

    const { rows } = await pool.query(
      `SELECT id FROM bookings
       WHERE room_id = $1
       AND statut IN ('pending', 'confirmed')
       AND NOT (check_out <= $2 OR check_in >= $3)`,
      [roomId, checkIn, checkOut]
    );

    const available = rows.length === 0;

    res.status(200).json({
      available,
      message: available
        ? 'Room is available'
        : 'Room is not available for selected dates'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to check availability' });
  }
};
