import pool from "../config/db.js";


export const getAllBookings = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    const { statut, userId, roomId } = req.query;

    let conditions = [];
    let values = [];

    if (!isAdmin) {
      values.push(req.user.id);
      conditions.push(`b.user_id = $${values.length}`);
    }

    if (statut) {
      values.push(statut);
      conditions.push(`b.statut = $${values.length}`);
    }

    if (userId && isAdmin) {
      values.push(userId);
      conditions.push(`b.user_id = $${values.length}`);
    }

    if (roomId) {
      values.push(roomId);
      conditions.push(`b.room_id = $${values.length}`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const query = `
      SELECT b.*,
        json_build_object(
          'id', u.id,
          'nom', u.nom,
          'email', u.email,
          'telephone', u.telephone
        ) AS user,
        json_build_object(
          'id', r.id,
          'numero', r.numero,
          'type', r.type,
          'prix', r.prix
        ) AS room
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      JOIN rooms r ON r.id = b.room_id
      ${whereClause}
      ORDER BY b.created_at DESC
    `;

    const { rows } = await pool.query(query, values);
    res.status(200).json({ data: rows });

  } catch (error) {
    console.error("Error in getAllBookings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === "admin";

    let sql = `
      SELECT b.*,
        json_build_object(
          'id', u.id,
          'nom', u.nom,
          'email', u.email,
          'telephone', u.telephone
        ) AS user,
        json_build_object(
          'id', r.id,
          'numero', r.numero,
          'type', r.type,
          'prix', r.prix,
          'description', r.description,
          'equipements', r.equipements
        ) AS room
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      JOIN rooms r ON r.id = b.room_id
      WHERE b.id = $1
    `;

    const values = [id];

    if (!isAdmin) {
      sql += " AND b.user_id = $2";
      values.push(req.user.id);
    }

    const { rows } = await pool.query(sql, values);

    if (!rows.length) {
      return res.status(404).json({ error: "Booking not found or access denied" });
    }

    res.status(200).json({ data: rows[0] });

  } catch (error) {
    console.error("Error in getBookingById:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const createBooking = async (req, res) => {
  try {
    const { room_id, check_in, check_out, mode_paiement } = req.body;

    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);

    if (checkOutDate <= checkInDate) {
      return res.status(400).json({ error: "Check-out must be after check-in" });
    }

    if (checkInDate < new Date()) {
      return res.status(400).json({ error: "Check-in cannot be in the past" });
    }

    // 🔍 disponibilité
    const availabilityQuery = `
      SELECT id FROM bookings
      WHERE room_id = $1
      AND statut IN ('pending', 'confirmed')
      AND NOT (
        check_out <= $2 OR check_in >= $3
      )
    `;

    const { rows: conflicts } = await pool.query(
      availabilityQuery,
      [room_id, check_in, check_out]
    );

    if (conflicts.length) {
      return res.status(409).json({ error: "Room not available" });
    }

    // 🏨 room
    const roomRes = await pool.query(
      "SELECT prix, statut FROM rooms WHERE id = $1",
      [room_id]
    );

    if (!roomRes.rows.length || roomRes.rows[0].statut !== "available") {
      return res.status(400).json({ error: "Room not available" });
    }

    const nights =
      (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24);

    const montant = parseFloat(roomRes.rows[0].prix) * nights;

    const insertQuery = `
      INSERT INTO bookings
      (user_id, room_id, check_in, check_out, montant, mode_paiement, statut)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *
    `;

    const { rows } = await pool.query(insertQuery, [
      req.user.id,
      room_id,
      check_in,
      check_out,
      montant,
      mode_paiement
    ]);

    res.status(201).json({ data: rows[0] });

  } catch (error) {
    console.error("Error in createBooking:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';
    const { check_in, check_out, statut, mode_paiement } = req.body;

    const { rows } = await pool.query(
      `SELECT * FROM bookings WHERE id = $1 AND ($2 = true OR user_id = $3)`,
      [id, isAdmin, req.user.id]
    );

    const booking = rows[0];
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found or forbidden' });
    }

    if (!isAdmin && booking.statut !== 'pending') {
      return res.status(403).json({ error: 'Modification not allowed' });
    }

    const { rows: updated } = await pool.query(
      `UPDATE bookings SET
        check_in = COALESCE($1, check_in),
        check_out = COALESCE($2, check_out),
        statut = COALESCE($3, statut),
        mode_paiement = COALESCE($4, mode_paiement)
       WHERE id = $5
       RETURNING *`,
      [check_in, check_out, statut, mode_paiement, id]
    );

    res.status(200).json({ data: updated[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Update failed' });
  }
};


export const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      `UPDATE bookings
       SET statut = 'cancelled'
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, req.user.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.status(200).json({
      message: 'Booking cancelled',
      data: rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Cancellation failed' });
  }
};

export const deleteBooking = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    await pool.query('DELETE FROM bookings WHERE id = $1', [req.params.id]);
    res.status(200).json({ message: 'Booking deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Delete failed' });
  }
};