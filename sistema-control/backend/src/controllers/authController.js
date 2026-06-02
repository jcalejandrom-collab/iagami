const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');

// ─── Validation rules ────────────────────────────────────────────────────────

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('El correo electrónico es requerido.')
    .isEmail().withMessage('El correo electrónico no tiene un formato válido.')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('La contraseña es requerida.')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.'),
];

// ─── Controller functions ─────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Authenticate an admin user and return a JWT.
 */
const login = async (req, res) => {
  // Run express-validator checks
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'Datos inválidos',
      details: errors.array(),
    });
  }

  const { email, password } = req.body;

  try {
    // Look up user by email
    const result = await query(
      'SELECT id, email, password_hash, name, role FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Credenciales incorrectas',
        message: 'El correo o la contraseña son incorrectos.',
      });
    }

    const user = result.rows[0];

    // Compare plain password with stored hash
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Credenciales incorrectas',
        message: 'El correo o la contraseña son incorrectos.',
      });
    }

    // Sign JWT
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('[authController.login]', err);
    return res.status(500).json({
      error: 'Error interno',
      message: 'Ocurrió un error al intentar iniciar sesión.',
    });
  }
};

/**
 * GET /api/auth/me
 * Return the authenticated user's information from the JWT payload.
 */
const me = (req, res) => {
  // req.user is set by the requireAuth middleware
  return res.status(200).json({
    user: req.user,
  });
};

module.exports = { login, me, loginValidation };
