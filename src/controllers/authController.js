import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";


const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "1d";

export const register = async (req, res) => {
  try {
    const { email, password, nom, telephone } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }

    const userExists = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(409).json({ error: "Utilisateur déjà existant" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password, nom, telephone, role)
       VALUES ($1, $2, $3, $4, 'client')
       RETURNING id, email, nom, telephone, role`,
      [email, hashedPassword, nom, telephone]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: "User registered successfully",
      user,
      token
    });

  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    delete user.password;

    // res.status(200).json({
    //   message: "Login successful",
    //   user,
    //   token
    // });

    res.status(200).json({
    user,  
    access_token: token,  
    refresh_token: token  
  });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const logout = async (req, res) => {
  res.status(200).json({
    message: "Logout successful (client side token removal)"
  });
};

export const getCurrentUser = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, nom, telephone, role FROM users WHERE id = $1",
      [req.user.id]
    );

    res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { user } = req;

    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};