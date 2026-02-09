import pool from '../config/db.js';

/* =========================
   GET ALL USERS (ADMIN)
========================= */
export const getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;

    let query = 'SELECT * FROM users';
    let values = [];

    if (role) {
      query += ' WHERE role = $1';
      values.push(role);
    }

    query += ' ORDER BY created_at DESC';

    const { rows } = await pool.query(query, values);
    res.status(200).json({ data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

/* =========================
   GET USER BY ID
========================= */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { rows } = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ data: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

/* =========================
   UPDATE USER
========================= */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';
    const { nom, telephone, email, role } = req.body;

    if (!isAdmin && id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const fields = [];
    const values = [];
    let i = 1;

    if (nom !== undefined) {
      fields.push(`nom = $${i++}`);
      values.push(nom);
    }

    if (telephone !== undefined) {
      fields.push(`telephone = $${i++}`);
      values.push(telephone);
    }

    if (email !== undefined) {
      fields.push(`email = $${i++}`);
      values.push(email);
    }

    if (role !== undefined) {
      if (!isAdmin) {
        return res.status(403).json({ error: 'Only admins can change user roles' });
      }
      fields.push(`role = $${i++}`);
      values.push(role);
    }

    if (!fields.length) {
      return res.status(400).json({ error: 'No data to update' });
    }

    values.push(id);

    const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${i}
      RETURNING *
    `;

    const { rows } = await pool.query(query, values);

    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ data: rows[0] });
  } catch (error) {
    console.error(error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
};

/* =========================
   DELETE USER (ADMIN)
========================= */
export const deleteUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete users' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

/* =========================
   GET PROFILE
========================= */
export const getProfile = async (req, res) => {
  try {
    res.status(200).json({ data: req.user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

/* =========================
   UPDATE PROFILE
========================= */
export const updateProfile = async (req, res) => {
  try {
    const { nom, telephone, email } = req.body;

    const fields = [];
    const values = [];
    let i = 1;

    if (nom !== undefined) {
      fields.push(`nom = $${i++}`);
      values.push(nom);
    }

    if (telephone !== undefined) {
      fields.push(`telephone = $${i++}`);
      values.push(telephone);
    }

    if (email !== undefined) {
      fields.push(`email = $${i++}`);
      values.push(email);
    }

    if (!fields.length) {
      return res.status(400).json({ error: 'No data to update' });
    }

    values.push(req.user.id);

    const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${i}
      RETURNING *
    `;

    const { rows } = await pool.query(query, values);

    res.status(200).json({ data: rows[0] });
  } catch (error) {
    console.error(error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to update profile' });
  }
};
