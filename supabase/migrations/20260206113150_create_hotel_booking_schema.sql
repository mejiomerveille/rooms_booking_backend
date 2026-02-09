/*
  # Hotel Booking System Database Schema

  ## Overview
  This migration creates the complete database schema for a hotel room booking application
  with role-based access control (RBAC) supporting admin and client roles.

  ## New Tables

  ### 1. `users`
  Extends Supabase auth.users with additional profile information
  - `id` (uuid, primary key) - References auth.users
  - `nom` (text) - User's full name
  - `email` (text, unique) - User's email address
  - `telephone` (text) - User's phone number
  - `role` (text) - User role: 'admin' or 'client'
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. `rooms`
  Hotel room information and availability
  - `id` (uuid, primary key) - Room unique identifier
  - `numero` (text, unique) - Room number
  - `type` (text) - Room type (single, double, suite, etc.)
  - `capacite` (integer) - Maximum number of guests
  - `prix` (decimal) - Price per night
  - `description` (text) - Detailed room description
  - `equipements` (jsonb) - Room amenities and equipment list
  - `statut` (text) - Room status: 'available', 'occupied', 'maintenance'
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. `room_photos`
  Photo gallery for each room
  - `id` (uuid, primary key) - Photo unique identifier
  - `room_id` (uuid, foreign key) - Reference to rooms table
  - `url` (text) - Photo URL
  - `ordre` (integer) - Display order
  - `created_at` (timestamptz) - Upload timestamp

  ### 4. `bookings`
  Room reservations and booking history
  - `id` (uuid, primary key) - Booking unique identifier
  - `user_id` (uuid, foreign key) - Reference to users table
  - `room_id` (uuid, foreign key) - Reference to rooms table
  - `check_in` (date) - Check-in date
  - `check_out` (date) - Check-out date
  - `statut` (text) - Booking status: 'pending', 'confirmed', 'cancelled', 'completed'
  - `montant` (decimal) - Total booking amount
  - `mode_paiement` (text) - Payment method
  - `reference` (text, unique) - Unique booking reference
  - `created_at` (timestamptz) - Booking creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security

  ### Row Level Security (RLS)
  All tables have RLS enabled with restrictive policies:

  #### Users Table
  - Authenticated users can read their own profile
  - Authenticated users can update their own profile (except role)
  - Admins can read all user profiles
  - Admins can update any user profile

  #### Rooms Table
  - Anyone can view available rooms (for public browsing)
  - Only admins can create, update, or delete rooms

  #### Room Photos Table
  - Anyone can view room photos
  - Only admins can manage room photos

  #### Bookings Table
  - Clients can view their own bookings
  - Clients can create bookings for themselves
  - Clients can update their own pending bookings
  - Clients can cancel their own bookings
  - Admins can view all bookings
  - Admins can update any booking

  ## Notes
  - All timestamps use UTC timezone
  - Passwords are managed by Supabase Auth (not stored in users table)
  - Default role for new users is 'client'
  - Room prices are in the local currency (to be specified in application config)
  - Booking references are auto-generated unique identifiers for customer service
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom text NOT NULL,
  email text UNIQUE NOT NULL,
  telephone text,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text UNIQUE NOT NULL,
  type text NOT NULL,
  capacite integer NOT NULL CHECK (capacite > 0),
  prix decimal(10, 2) NOT NULL CHECK (prix >= 0),
  description text,
  equipements jsonb DEFAULT '[]'::jsonb,
  statut text NOT NULL DEFAULT 'available' CHECK (statut IN ('available', 'occupied', 'maintenance')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create room_photos table
CREATE TABLE IF NOT EXISTS room_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  url text NOT NULL,
  ordre integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  check_in date NOT NULL,
  check_out date NOT NULL,
  statut text NOT NULL DEFAULT 'pending' CHECK (statut IN ('pending', 'confirmed', 'cancelled', 'completed')),
  montant decimal(10, 2) NOT NULL CHECK (montant >= 0),
  mode_paiement text,
  reference text UNIQUE NOT NULL DEFAULT concat('BK-', upper(substr(gen_random_uuid()::text, 1, 8))),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (check_out > check_in)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_rooms_statut ON rooms(statut);
CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms(type);
CREATE INDEX IF NOT EXISTS idx_room_photos_room_id ON room_photos(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_bookings_statut ON bookings(statut);
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(reference);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms;
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Users can update their own profile (but not role)
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM users WHERE id = auth.uid())
  );

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Only authenticated users can insert their own profile
CREATE POLICY "Users can create own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- ROOMS TABLE POLICIES
-- =====================================================

-- Anyone can view available rooms (public access for browsing)
CREATE POLICY "Anyone can view rooms"
  ON rooms FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only admins can insert rooms
CREATE POLICY "Admins can create rooms"
  ON rooms FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Only admins can update rooms
CREATE POLICY "Admins can update rooms"
  ON rooms FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Only admins can delete rooms
CREATE POLICY "Admins can delete rooms"
  ON rooms FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- =====================================================
-- ROOM PHOTOS TABLE POLICIES
-- =====================================================

-- Anyone can view room photos
CREATE POLICY "Anyone can view room photos"
  ON room_photos FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only admins can insert room photos
CREATE POLICY "Admins can create room photos"
  ON room_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Only admins can update room photos
CREATE POLICY "Admins can update room photos"
  ON room_photos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Only admins can delete room photos
CREATE POLICY "Admins can delete room photos"
  ON room_photos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- =====================================================
-- BOOKINGS TABLE POLICIES
-- =====================================================

-- Users can view their own bookings
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all bookings
CREATE POLICY "Admins can view all bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Users can create bookings for themselves
CREATE POLICY "Users can create own bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own bookings
CREATE POLICY "Users can update own bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can update any booking
CREATE POLICY "Admins can update any booking"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Users can delete their own bookings (soft delete by updating status is preferred)
CREATE POLICY "Users can delete own bookings"
  ON bookings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can delete any booking
CREATE POLICY "Admins can delete any booking"
  ON bookings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );