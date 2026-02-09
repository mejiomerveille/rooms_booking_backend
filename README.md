# Hotel Booking Backend API

Backend Node.js pour application mobile de réservation de chambres d'hôtel avec Supabase.

## Stack Technique

- Node.js avec Express
- Supabase (Base de données PostgreSQL + Authentication)
- Express Validator pour la validation
- CORS et Helmet pour la sécurité

## Installation

```bash
npm install
```

## Configuration

Créez un fichier `.env` basé sur `.env.example`:

```env
SUPABASE_URL=votre_url_supabase
SUPABASE_ANON_KEY=votre_cle_anon_supabase
PORT=3000
NODE_ENV=development
```

## Démarrage

```bash
npm start
```

Pour le développement avec auto-reload:

```bash
npm run dev
```

## Architecture de la Base de Données

### Tables

#### users
- Profils utilisateurs avec rôles (admin/client)
- Champs: id, nom, email, téléphone, role

#### rooms
- Informations sur les chambres d'hôtel
- Champs: id, numero, type, capacite, prix, description, equipements, statut

#### room_photos
- Photos des chambres
- Champs: id, room_id, url, ordre

#### bookings
- Réservations de chambres
- Champs: id, user_id, room_id, check_in, check_out, statut, montant, mode_paiement, reference

### Sécurité RLS

Toutes les tables ont Row Level Security activé:
- **Clients**: Accès CRUD à leurs propres réservations et profil uniquement
- **Admins**: Accès CRUD complet à toutes les ressources

## API Endpoints

### Authentication (`/api/auth`)

#### POST /api/auth/register
Inscription d'un nouvel utilisateur
```json
{
  "email": "user@example.com",
  "password": "password123",
  "nom": "John Doe",
  "telephone": "+33612345678"
}
```

#### POST /api/auth/login
Connexion
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### POST /api/auth/logout
Déconnexion (requiert authentification)

#### GET /api/auth/me
Obtenir l'utilisateur actuel (requiert authentification)

#### POST /api/auth/refresh
Rafraîchir le token
```json
{
  "refresh_token": "token"
}
```

### Users (`/api/users`)

#### GET /api/users/profile
Obtenir son propre profil (requiert authentification)

#### PUT /api/users/profile
Mettre à jour son profil (requiert authentification)
```json
{
  "nom": "John Doe",
  "telephone": "+33612345678",
  "email": "newemail@example.com"
}
```

#### GET /api/users
Liste tous les utilisateurs (admin uniquement)

#### GET /api/users/:id
Détails d'un utilisateur

#### PUT /api/users/:id
Mettre à jour un utilisateur (admin ou soi-même)

#### DELETE /api/users/:id
Supprimer un utilisateur (admin uniquement)

### Rooms (`/api/rooms`)

#### GET /api/rooms
Liste toutes les chambres (public)
Query params: `type`, `statut`, `minPrice`, `maxPrice`, `capacite`

#### GET /api/rooms/:id
Détails d'une chambre (public)

#### GET /api/rooms/:roomId/availability
Vérifier la disponibilité d'une chambre
Query params: `checkIn`, `checkOut`

#### POST /api/rooms
Créer une chambre (admin uniquement)
```json
{
  "numero": "101",
  "type": "Suite",
  "capacite": 2,
  "prix": 150.00,
  "description": "Suite luxueuse avec vue mer",
  "equipements": ["wifi", "tv", "minibar"],
  "statut": "available"
}
```

#### PUT /api/rooms/:id
Mettre à jour une chambre (admin uniquement)

#### DELETE /api/rooms/:id
Supprimer une chambre (admin uniquement)

#### POST /api/rooms/:roomId/photos
Ajouter une photo à une chambre (admin uniquement)
```json
{
  "url": "https://example.com/photo.jpg",
  "ordre": 1
}
```

#### DELETE /api/rooms/:roomId/photos/:photoId
Supprimer une photo (admin uniquement)

### Bookings (`/api/bookings`)

#### GET /api/bookings
Liste des réservations (utilisateur voit les siennes, admin voit toutes)
Query params: `statut`, `userId`, `roomId`

#### GET /api/bookings/:id
Détails d'une réservation

#### POST /api/bookings
Créer une réservation (requiert authentification)
```json
{
  "room_id": "uuid",
  "check_in": "2024-01-01",
  "check_out": "2024-01-05",
  "mode_paiement": "carte bancaire"
}
```

#### PUT /api/bookings/:id
Mettre à jour une réservation
```json
{
  "check_in": "2024-01-02",
  "check_out": "2024-01-06",
  "statut": "confirmed"
}
```

#### POST /api/bookings/:id/cancel
Annuler une réservation

#### DELETE /api/bookings/:id
Supprimer une réservation (admin uniquement)

## Authentication

Toutes les requêtes authentifiées doivent inclure le token JWT dans le header:

```
Authorization: Bearer <access_token>
```

## Statuts des Réservations

- `pending`: En attente de confirmation
- `confirmed`: Confirmée
- `cancelled`: Annulée
- `completed`: Terminée

## Statuts des Chambres

- `available`: Disponible
- `occupied`: Occupée
- `maintenance`: En maintenance

## Rôles Utilisateurs

- `client`: Utilisateur standard (peut créer et gérer ses réservations)
- `admin`: Administrateur (accès complet)

## Gestion des Erreurs

L'API retourne des codes HTTP standard:
- `200`: Succès
- `201`: Créé
- `400`: Requête invalide
- `401`: Non authentifié
- `403`: Accès refusé
- `404`: Non trouvé
- `409`: Conflit (ex: chambre déjà réservée)
- `500`: Erreur serveur

## Sécurité

- HTTPS recommandé en production
- Tokens JWT avec expiration
- Row Level Security (RLS) sur toutes les tables
- Validation des entrées avec Express Validator
- Helmet.js pour les headers de sécurité
- CORS configuré
