import 'dotenv/config';

import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import nodemailer from 'nodemailer';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, unlink } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const requiredEnvironment = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_DATABASE', 'JWT_SECRET', 'API_PUBLIC_URL'];
for (const key of requiredEnvironment) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}
if (process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');

const app = express();
const port = Number(process.env.PORT ?? 3000);
const apiPublicUrl = process.env.API_PUBLIC_URL.replace(/\/$/, '');
const allowedOrigins = process.env.APP_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean);
const uploadDirectory = fileURLToPath(new URL('./uploads/', import.meta.url));
mkdirSync(uploadDirectory, { recursive: true });
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT ?? 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD ?? '',
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
});
const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  } : undefined,
});
const recipeMediaUpload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => callback(null, uploadDirectory),
    filename: (_request, file, callback) => {
      const extension = file.mimetype.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'bin';
      callback(null, `${randomUUID()}.${extension}`);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024, files: 3 },
  fileFilter: (_request, file, callback) => callback(null,
    file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')),
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      'upgrade-insecure-requests': process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
}));
app.use(cors({ origin: allowedOrigins?.length ? allowedOrigins : true }));
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function validateRecipePayload(body) {
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  const prepTimeMinutes = Number(body?.prepTimeMinutes);
  const servings = Number(body?.servings);
  const difficulty = body?.difficulty;
  const ingredients = body?.ingredients;
  const steps = body?.steps;
  if (
    !title || title.length > 140 || !description || description.length > 5000 ||
    !Number.isInteger(prepTimeMinutes) || prepTimeMinutes < 1 || prepTimeMinutes > 1440 ||
    !Number.isInteger(servings) || servings < 1 || servings > 99 ||
    !['Fácil', 'Médio', 'Difícil'].includes(difficulty) ||
    !Array.isArray(ingredients) || ingredients.length < 1 || ingredients.length > 50 ||
    ingredients.some((item) => !item || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 160 || typeof item.quantity !== 'string' || !item.quantity.trim() || item.quantity.length > 80) ||
    !Array.isArray(steps) || steps.length < 1 || steps.length > 50 ||
    steps.some((step) => typeof step !== 'string' || !step.trim() || step.length > 3000)
  ) return null;

  return {
    title,
    description,
    prepTimeMinutes,
    servings,
    difficulty,
    ingredients: ingredients.map((item) => ({ name: item.name.trim(), quantity: item.quantity.trim() })),
    steps: steps.map((step) => step.trim()),
  };
}

function verificationPage(message, token) {
  const action = token
    ? `<form method="post" action="/api/auth/verify"><input type="hidden" name="token" value="${token}"><button type="submit">Confirmar meu e-mail</button></form>`
    : '';
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Verificação de e-mail</title><body><main><h1>${message}</h1>${action}</main></body></html>`;
}

async function sendVerificationEmail(email, token) {
  const link = `${apiPublicUrl}/api/auth/verify?token=${encodeURIComponent(token)}`;
  await mailer.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Confirme seu e-mail - Sabores da Terra',
    text: `Para concluir seu cadastro, abra este link e confirme seu e-mail: ${link}\n\nEste link expira em 24 horas.`,
    html: `<p>Para concluir seu cadastro, confirme seu e-mail:</p><p><a href="${link}">Continuar cadastro</a></p><p>O link expira em 24 horas.</p>`,
  });
}

app.get('/health', (_request, response) => response.json({ status: 'ok' }));

app.post('/api/auth/register', authRateLimit, async (request, response, next) => {
  try {
    const name = typeof request.body?.name === 'string' ? request.body.name.trim() : '';
    const email = typeof request.body?.email === 'string' ? normalizeEmail(request.body.email) : '';
    const password = typeof request.body?.password === 'string' ? request.body.password : '';
    if (!name || name.length > 100 || !isValidEmail(email) || password.length < 8 || password.length > 72) {
      return response.status(400).json({ error: 'Informe nome, e-mail válido e senha com pelo menos 8 caracteres.' });
    }

    const [existingUsers] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length) return response.status(409).json({ error: 'Este e-mail já está cadastrado.' });

    const token = randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const passwordHash = await bcrypt.hash(password, 12);
    await pool.execute(
      `INSERT INTO pending_registrations (email, name, password_hash, token_hash, expires_at)
       VALUES (?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 24 HOUR))
       ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash),
         token_hash = VALUES(token_hash), expires_at = VALUES(expires_at), created_at = CURRENT_TIMESTAMP`,
      [email, name, passwordHash, tokenHash],
    );

    try {
      await sendVerificationEmail(email, token);
    } catch (error) {
      await pool.execute('DELETE FROM pending_registrations WHERE email = ? AND token_hash = ?', [email, tokenHash]);
      throw error;
    }
    return response.status(202).json({ message: 'Enviamos um link de confirmação para seu e-mail.' });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/resend-verification', authRateLimit, async (request, response, next) => {
  try {
    const email = typeof request.body?.email === 'string' ? normalizeEmail(request.body.email) : '';
    if (isValidEmail(email)) {
      const [pending] = await pool.execute('SELECT email FROM pending_registrations WHERE email = ?', [email]);
      if (pending.length) {
        const token = randomBytes(32).toString('hex');
        const tokenHash = hashToken(token);
        await pool.execute(
          'UPDATE pending_registrations SET token_hash = ?, expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 24 HOUR) WHERE email = ?',
          [tokenHash, email],
        );
        await sendVerificationEmail(email, token);
      }
    }
    return response.json({ message: 'Se houver um cadastro pendente, enviaremos um novo link.' });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/auth/verify', (request, response) => {
  const token = typeof request.query.token === 'string' ? request.query.token : '';
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return response.status(400).type('html').send(verificationPage('Link de confirmação inválido ou expirado.'));
  }
  return response.type('html').send(verificationPage('Confirme seu e-mail para criar sua conta.', token));
});

app.post('/api/auth/verify', authRateLimit, async (request, response, next) => {
  const token = typeof request.body?.token === 'string' ? request.body.token : '';
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return response.status(400).type('html').send(verificationPage('Link de confirmação inválido ou expirado.'));
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [pending] = await connection.execute(
      'SELECT email, name, password_hash FROM pending_registrations WHERE token_hash = ? AND expires_at > UTC_TIMESTAMP() FOR UPDATE',
      [hashToken(token)],
    );
    if (!pending.length) {
      await connection.rollback();
      return response.status(400).type('html').send(verificationPage('Link de confirmação inválido ou expirado.'));
    }

    const registration = pending[0];
    await connection.execute(
      'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
      [randomUUID(), registration.name, registration.email, registration.password_hash],
    );
    await connection.execute('DELETE FROM pending_registrations WHERE email = ?', [registration.email]);
    await connection.commit();
    return response.type('html').send(verificationPage('E-mail confirmado. Sua conta foi criada; agora você já pode entrar.'));
  } catch (error) {
    await connection.rollback();
    return next(error);
  } finally {
    connection.release();
  }
});

app.post('/api/auth/login', authRateLimit, async (request, response, next) => {
  try {
    const email = typeof request.body?.email === 'string' ? normalizeEmail(request.body.email) : '';
    const password = typeof request.body?.password === 'string' ? request.body.password : '';
    const [users] = await pool.execute(
      'SELECT id, name, email, password_hash FROM users WHERE email = ?',
      [email],
    );
    if (!users.length || !(await bcrypt.compare(password, users[0].password_hash))) {
      return response.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    const user = { id: users[0].id, name: users[0].name, email: users[0].email };
    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1d', issuer: 'sabores-da-terra-api' });
    return response.json({ token, user });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/change-password', authRateLimit, async (request, response, next) => {
  const authorization = request.headers.authorization ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  let userId;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'sabores-da-terra-api' });
    userId = typeof payload === 'object' && typeof payload.id === 'string' ? payload.id : '';
  } catch {
    return response.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }

  const currentPassword = typeof request.body?.currentPassword === 'string' ? request.body.currentPassword : '';
  const newPassword = typeof request.body?.newPassword === 'string' ? request.body.newPassword : '';
  if (newPassword.length < 8 || newPassword.length > 72) {
    return response.status(400).json({ error: 'A nova senha deve ter entre 8 e 72 caracteres.' });
  }
  if (currentPassword === newPassword) {
    return response.status(400).json({ error: 'A nova senha deve ser diferente da senha atual.' });
  }

  try {
    const [users] = await pool.execute('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!users.length || !(await bcrypt.compare(currentPassword, users[0].password_hash))) {
      return response.status(401).json({ error: 'A senha atual está incorreta.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
    return response.json({ message: 'Senha alterada com sucesso.' });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/auth/me', async (request, response) => {
  const authorization = request.headers.authorization ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'sabores-da-terra-api' });
    return response.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch {
    return response.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }
});

function requireAuth(request, response, next) {
  const authorization = request.headers.authorization ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'sabores-da-terra-api' });
    if (typeof payload !== 'object' || typeof payload.id !== 'string') {
      return response.status(401).json({ error: 'Sessão inválida ou expirada.' });
    }
    request.authUserId = payload.id;
    return next();
  } catch {
    return response.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }
}

async function getRecipeDetails(recipeId) {
  const [recipes] = await pool.execute(
    `SELECT r.id, r.user_id, r.title, r.description, r.prep_time_minutes, r.servings, r.difficulty,
       r.created_at, u.name AS author_name,
       (SELECT ROUND(AVG(rating), 1) FROM recipe_ratings WHERE recipe_id = r.id) AS average_rating,
       (SELECT COUNT(*) FROM recipe_ratings WHERE recipe_id = r.id) AS rating_count
     FROM recipes r JOIN users u ON u.id = r.user_id WHERE r.id = ?`,
    [recipeId],
  );
  if (!recipes.length) return null;

  const recipe = recipes[0];
  const [[ingredients], [steps], [media], [comments]] = await Promise.all([
    pool.execute('SELECT name, quantity FROM recipe_ingredients WHERE recipe_id = ? ORDER BY position', [recipeId]),
    pool.execute('SELECT instruction FROM recipe_steps WHERE recipe_id = ? ORDER BY position', [recipeId]),
    pool.execute('SELECT id, media_type, mime_type, file_size FROM recipe_media WHERE recipe_id = ? ORDER BY created_at', [recipeId]),
    pool.execute(
      `SELECT c.id, c.body AS text, u.name AS author, c.created_at AS createdAt
       FROM recipe_comments c JOIN users u ON u.id = c.user_id
       WHERE c.recipe_id = ? ORDER BY c.created_at`,
      [recipeId],
    ),
  ]);

  return {
    id: recipe.id,
    authorId: recipe.user_id,
    title: recipe.title,
    description: recipe.description,
    prepTimeMinutes: recipe.prep_time_minutes,
    servings: recipe.servings,
    difficulty: recipe.difficulty,
    author: recipe.author_name,
    ingredients,
    steps: steps.map((step) => step.instruction),
    media: media.map((item) => ({
      id: item.id,
      type: item.media_type,
      mimeType: item.mime_type,
      fileSize: Number(item.file_size),
      url: `/api/recipes/${recipeId}/media/${item.id}`,
    })),
    comments,
    averageRating: recipe.average_rating === null ? null : Number(recipe.average_rating),
    ratingCount: Number(recipe.rating_count),
  };
}

app.get('/api/recipes', async (request, response, next) => {
  try {
    const conditions = [];
    const values = [];
    const search = typeof request.query.q === 'string' ? request.query.q.trim() : '';
    const difficulty = typeof request.query.difficulty === 'string' ? request.query.difficulty : '';
    const maxTime = Number(request.query.maxTime);
    if (search) {
      conditions.push(`(r.title LIKE ? OR r.description LIKE ? OR EXISTS (
        SELECT 1 FROM recipe_ingredients ri WHERE ri.recipe_id = r.id AND ri.name LIKE ?
      ))`);
      const pattern = `%${search}%`;
      values.push(pattern, pattern, pattern);
    }
    if (['Fácil', 'Médio', 'Difícil'].includes(difficulty)) {
      conditions.push('r.difficulty = ?');
      values.push(difficulty);
    }
    if (Number.isInteger(maxTime) && maxTime > 0) {
      conditions.push('r.prep_time_minutes <= ?');
      values.push(maxTime);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [recipes] = await pool.execute(
      `SELECT r.id, r.title, r.description, r.prep_time_minutes, r.servings, r.difficulty,
         r.created_at, u.name AS author,
        (SELECT id FROM recipe_media WHERE recipe_id = r.id AND media_type = 'image' ORDER BY created_at DESC LIMIT 1) AS image_media_id,
         (SELECT ROUND(AVG(rating), 1) FROM recipe_ratings WHERE recipe_id = r.id) AS average_rating,
         (SELECT COUNT(*) FROM recipe_ratings WHERE recipe_id = r.id) AS rating_count
       FROM recipes r JOIN users u ON u.id = r.user_id ${where} ORDER BY r.created_at DESC`,
      values,
    );
    const results = await Promise.all(recipes.map(async (recipe) => {
      const [ingredients] = await pool.execute(
        'SELECT name, quantity FROM recipe_ingredients WHERE recipe_id = ? ORDER BY position',
        [recipe.id],
      );
      return {
        id: recipe.id,
        title: recipe.title,
        description: recipe.description,
        prepTimeMinutes: recipe.prep_time_minutes,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        author: recipe.author,
        imageUrl: recipe.image_media_id ? `/api/recipes/${recipe.id}/media/${recipe.image_media_id}` : null,
        ingredients,
        averageRating: recipe.average_rating === null ? null : Number(recipe.average_rating),
        ratingCount: Number(recipe.rating_count),
      };
    }));
    return response.json({ recipes: results });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/recipes/:id/comments', requireAuth, async (request, response, next) => {
  const body = typeof request.body?.text === 'string' ? request.body.text.trim() : '';
  if (!body || body.length > 1000) return response.status(400).json({ error: 'O comentário deve ter entre 1 e 1000 caracteres.' });
  try {
    const commentId = randomUUID();
    const [result] = await pool.execute(
      'INSERT INTO recipe_comments (id, recipe_id, user_id, body) VALUES (?, ?, ?, ?)',
      [commentId, request.params.id, request.authUserId, body],
    );
    if (!result.affectedRows) return response.status(404).json({ error: 'Receita não encontrada.' });
    const [comments] = await pool.execute(
      `SELECT c.id, c.body AS text, u.name AS author, c.created_at AS createdAt
       FROM recipe_comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?`,
      [commentId],
    );
    return response.status(201).json({ comment: comments[0] });
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') return response.status(404).json({ error: 'Receita não encontrada.' });
    return next(error);
  }
});

app.put('/api/recipes/:id/rating', requireAuth, async (request, response, next) => {
  const rating = Number(request.body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return response.status(400).json({ error: 'A avaliação deve ser de 1 a 5.' });
  }
  try {
    const [recipes] = await pool.execute('SELECT user_id FROM recipes WHERE id = ?', [request.params.id]);
    if (!recipes.length) return response.status(404).json({ error: 'Receita não encontrada.' });
    if (recipes[0].user_id === request.authUserId) {
      return response.status(403).json({ error: 'Você não pode avaliar uma receita criada por você.' });
    }
    await pool.execute(
      `INSERT INTO recipe_ratings (recipe_id, user_id, rating) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), updated_at = CURRENT_TIMESTAMP`,
      [request.params.id, request.authUserId, rating],
    );
    const recipe = await getRecipeDetails(request.params.id);
    if (!recipe) return response.status(404).json({ error: 'Receita não encontrada.' });
    return response.json({ averageRating: recipe.averageRating, ratingCount: recipe.ratingCount });
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') return response.status(404).json({ error: 'Receita não encontrada.' });
    return next(error);
  }
});

app.post('/api/recipes/:id/reports', requireAuth, async (request, response, next) => {
  const targetType = request.body?.targetType;
  const commentId = typeof request.body?.commentId === 'string' ? request.body.commentId : null;
  const reason = typeof request.body?.reason === 'string' ? request.body.reason : '';
  const details = typeof request.body?.details === 'string' ? request.body.details.trim() : '';
  if (
    !['recipe', 'comment'].includes(targetType) ||
    !['Conteúdo ofensivo', 'Informação incorreta', 'Imagem inadequada', 'Plágio'].includes(reason) ||
    details.length > 1000 ||
    (targetType === 'comment' && !commentId)
  ) return response.status(400).json({ error: 'Confira os dados da denúncia.' });

  try {
    if (targetType === 'comment') {
      const [comments] = await pool.execute('SELECT id FROM recipe_comments WHERE id = ? AND recipe_id = ?', [commentId, request.params.id]);
      if (!comments.length) return response.status(404).json({ error: 'Comentário não encontrado.' });
    }
    await pool.execute(
      'INSERT INTO recipe_reports (id, recipe_id, reporter_id, comment_id, target_type, reason, details) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [randomUUID(), request.params.id, request.authUserId, commentId, targetType, reason, details],
    );
    return response.status(201).json({ message: 'Denúncia enviada.' });
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') return response.status(404).json({ error: 'Receita não encontrada.' });
    return next(error);
  }
});

app.get('/api/me/state', requireAuth, async (request, response, next) => {
  try {
    const [[saved], [lists], [listItems], [shoppingItems]] = await Promise.all([
      pool.execute('SELECT recipe_id FROM saved_recipes WHERE user_id = ?', [request.authUserId]),
      pool.execute('SELECT id, name FROM recipe_lists WHERE user_id = ? ORDER BY created_at', [request.authUserId]),
      pool.execute(
        `SELECT li.list_id, li.recipe_id FROM recipe_list_items li
         JOIN recipe_lists l ON l.id = li.list_id WHERE l.user_id = ?`,
        [request.authUserId],
      ),
      pool.execute('SELECT id, name, completed FROM shopping_list_items WHERE user_id = ? ORDER BY created_at', [request.authUserId]),
    ]);
    return response.json({
      savedRecipeIds: saved.map((item) => item.recipe_id),
      savedLists: lists.map((list) => ({
        id: list.id,
        name: list.name,
        recipeIds: listItems.filter((item) => item.list_id === list.id).map((item) => item.recipe_id),
      })),
      shoppingItems: shoppingItems.map((item) => ({ ...item, completed: Boolean(item.completed) })),
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/me/saved-recipes/:recipeId', requireAuth, async (request, response, next) => {
  try {
    const [recipes] = await pool.execute('SELECT id FROM recipes WHERE id = ?', [request.params.recipeId]);
    if (!recipes.length) return response.status(404).json({ error: 'Receita não encontrada.' });
    await pool.execute('INSERT IGNORE INTO saved_recipes (user_id, recipe_id) VALUES (?, ?)', [request.authUserId, request.params.recipeId]);
    return response.status(204).end();
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') return response.status(404).json({ error: 'Receita não encontrada.' });
    return next(error);
  }
});

app.delete('/api/me/saved-recipes/:recipeId', requireAuth, async (request, response, next) => {
  try {
    await pool.execute('DELETE FROM saved_recipes WHERE user_id = ? AND recipe_id = ?', [request.authUserId, request.params.recipeId]);
    return response.status(204).end();
  } catch (error) {
    return next(error);
  }
});

app.post('/api/me/lists', requireAuth, async (request, response, next) => {
  const name = typeof request.body?.name === 'string' ? request.body.name.trim() : '';
  if (!name || name.length > 80) return response.status(400).json({ error: 'O nome da lista deve ter entre 1 e 80 caracteres.' });
  try {
    const id = randomUUID();
    await pool.execute('INSERT INTO recipe_lists (id, user_id, name) VALUES (?, ?, ?)', [id, request.authUserId, name]);
    return response.status(201).json({ id, name, recipeIds: [] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return response.status(409).json({ error: 'Você já tem uma lista com esse nome.' });
    return next(error);
  }
});

app.post('/api/me/lists/:listId/recipes/:recipeId', requireAuth, async (request, response, next) => {
  try {
    const [lists] = await pool.execute('SELECT id FROM recipe_lists WHERE id = ? AND user_id = ?', [request.params.listId, request.authUserId]);
    if (!lists.length) return response.status(404).json({ error: 'Lista não encontrada.' });
    await pool.execute('INSERT IGNORE INTO recipe_list_items (list_id, recipe_id) VALUES (?, ?)', [request.params.listId, request.params.recipeId]);
    return response.status(204).end();
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') return response.status(404).json({ error: 'Receita não encontrada.' });
    return next(error);
  }
});

app.delete('/api/me/lists/:listId/recipes/:recipeId', requireAuth, async (request, response, next) => {
  try {
    const [lists] = await pool.execute('SELECT id FROM recipe_lists WHERE id = ? AND user_id = ?', [request.params.listId, request.authUserId]);
    if (!lists.length) return response.status(404).json({ error: 'Lista não encontrada.' });
    await pool.execute('DELETE FROM recipe_list_items WHERE list_id = ? AND recipe_id = ?', [request.params.listId, request.params.recipeId]);
    return response.status(204).end();
  } catch (error) {
    return next(error);
  }
});

app.post('/api/me/shopping-items', requireAuth, async (request, response, next) => {
  const name = typeof request.body?.name === 'string' ? request.body.name.trim() : '';
  if (!name || name.length > 160) return response.status(400).json({ error: 'O item deve ter entre 1 e 160 caracteres.' });
  try {
    const id = randomUUID();
    await pool.execute('INSERT INTO shopping_list_items (id, user_id, name) VALUES (?, ?, ?)', [id, request.authUserId, name]);
    return response.status(201).json({ item: { id, name, completed: false } });
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/me/shopping-items/:id', requireAuth, async (request, response, next) => {
  if (typeof request.body?.completed !== 'boolean') return response.status(400).json({ error: 'Informe o estado concluído do item.' });
  try {
    const [result] = await pool.execute(
      'UPDATE shopping_list_items SET completed = ? WHERE id = ? AND user_id = ?',
      [request.body.completed, request.params.id, request.authUserId],
    );
    if (!result.affectedRows) return response.status(404).json({ error: 'Item não encontrado.' });
    return response.status(204).end();
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/me/shopping-items/:id', requireAuth, async (request, response, next) => {
  try {
    await pool.execute('DELETE FROM shopping_list_items WHERE id = ? AND user_id = ?', [request.params.id, request.authUserId]);
    return response.status(204).end();
  } catch (error) {
    return next(error);
  }
});

app.get('/api/recipes/mine', requireAuth, async (request, response, next) => {
  try {
    const [recipes] = await pool.execute(
      'SELECT id, title, description, prep_time_minutes, servings, difficulty, created_at FROM recipes WHERE user_id = ? ORDER BY created_at DESC',
      [request.authUserId],
    );
    const results = await Promise.all(recipes.map(async (recipe) => {
      const [[ingredients], [steps], [media]] = await Promise.all([
        pool.execute('SELECT name, quantity FROM recipe_ingredients WHERE recipe_id = ? ORDER BY position', [recipe.id]),
        pool.execute('SELECT instruction FROM recipe_steps WHERE recipe_id = ? ORDER BY position', [recipe.id]),
        pool.execute('SELECT id, media_type, mime_type, file_size FROM recipe_media WHERE recipe_id = ? ORDER BY created_at', [recipe.id]),
      ]);
      return {
        id: recipe.id,
        title: recipe.title,
        description: recipe.description,
        prepTimeMinutes: recipe.prep_time_minutes,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        ingredients,
        steps: steps.map((step) => step.instruction),
        media: media.map((item) => ({
          id: item.id,
          type: item.media_type,
          mimeType: item.mime_type,
          fileSize: Number(item.file_size),
          url: `/api/recipes/${recipe.id}/media/${item.id}`,
        })),
        createdAt: recipe.created_at,
      };
    }));
    return response.json({ recipes: results });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/recipes/:id', async (request, response, next) => {
  try {
    const recipe = await getRecipeDetails(request.params.id);
    if (!recipe) return response.status(404).json({ error: 'Receita não encontrada.' });
    return response.json({ recipe });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/recipes', requireAuth, async (request, response, next) => {
  const recipe = validateRecipePayload(request.body);
  if (!recipe) {
    return response.status(400).json({ error: 'Confira os dados, ingredientes e passos da receita.' });
  }

  const recipeId = randomUUID();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      'INSERT INTO recipes (id, user_id, title, description, prep_time_minutes, servings, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [recipeId, request.authUserId, recipe.title, recipe.description, recipe.prepTimeMinutes, recipe.servings, recipe.difficulty],
    );
    for (const [position, ingredient] of recipe.ingredients.entries()) {
      await connection.execute(
        'INSERT INTO recipe_ingredients (id, recipe_id, name, quantity, position) VALUES (?, ?, ?, ?, ?)',
        [randomUUID(), recipeId, ingredient.name, ingredient.quantity, position],
      );
    }
    for (const [position, instruction] of recipe.steps.entries()) {
      await connection.execute(
        'INSERT INTO recipe_steps (id, recipe_id, instruction, position) VALUES (?, ?, ?, ?)',
        [randomUUID(), recipeId, instruction, position],
      );
    }
    await connection.commit();
    return response.status(201).json({ id: recipeId });
  } catch (error) {
    await connection.rollback();
    return next(error);
  } finally {
    connection.release();
  }
});

app.put('/api/recipes/:id', requireAuth, async (request, response, next) => {
  const recipe = validateRecipePayload(request.body);
  if (!recipe) return response.status(400).json({ error: 'Confira os dados, ingredientes e passos da receita.' });

  let connection;
  let transactionStarted = false;
  try {
    const [recipes] = await pool.execute('SELECT id FROM recipes WHERE id = ? AND user_id = ?', [request.params.id, request.authUserId]);
    if (!recipes.length) return response.status(404).json({ error: 'Receita não encontrada.' });
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;
    await connection.execute(
      'UPDATE recipes SET title = ?, description = ?, prep_time_minutes = ?, servings = ?, difficulty = ? WHERE id = ? AND user_id = ?',
      [recipe.title, recipe.description, recipe.prepTimeMinutes, recipe.servings, recipe.difficulty, request.params.id, request.authUserId],
    );
    await connection.execute('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [request.params.id]);
    await connection.execute('DELETE FROM recipe_steps WHERE recipe_id = ?', [request.params.id]);
    for (const [position, ingredient] of recipe.ingredients.entries()) {
      await connection.execute(
        'INSERT INTO recipe_ingredients (id, recipe_id, name, quantity, position) VALUES (?, ?, ?, ?, ?)',
        [randomUUID(), request.params.id, ingredient.name, ingredient.quantity, position],
      );
    }
    for (const [position, instruction] of recipe.steps.entries()) {
      await connection.execute(
        'INSERT INTO recipe_steps (id, recipe_id, instruction, position) VALUES (?, ?, ?, ?)',
        [randomUUID(), request.params.id, instruction, position],
      );
    }
    await connection.commit();
    transactionStarted = false;
    return response.status(204).end();
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    return next(error);
  } finally {
    connection?.release();
  }
});

app.delete('/api/recipes/:id', requireAuth, async (request, response, next) => {
  try {
    const [media] = await pool.execute(
      'SELECT m.file_name FROM recipe_media m JOIN recipes r ON r.id = m.recipe_id WHERE r.id = ? AND r.user_id = ?',
      [request.params.id, request.authUserId],
    );
    const [result] = await pool.execute('DELETE FROM recipes WHERE id = ? AND user_id = ?', [request.params.id, request.authUserId]);
    if (!result.affectedRows) return response.status(404).json({ error: 'Receita não encontrada.' });
    await Promise.all(media.map((item) => new Promise((resolve) => unlink(join(uploadDirectory, item.file_name), resolve))));
    return response.status(204).end();
  } catch (error) {
    return next(error);
  }
});

app.post('/api/recipes/:id/media', requireAuth, async (request, response, next) => {
  try {
    const [recipes] = await pool.execute('SELECT id FROM recipes WHERE id = ? AND user_id = ?', [request.params.id, request.authUserId]);
    if (!recipes.length) return response.status(404).json({ error: 'Receita não encontrada.' });
    return next();
  } catch (error) {
    return next(error);
  }
}, recipeMediaUpload.fields([{ name: 'image', maxCount: 1 }, { name: 'audio', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (request, response, next) => {
  const files = request.files ?? {};
  const mediaFiles = [
    ...(files.image ?? []).map((file) => ({ file, type: 'image' })),
    ...(files.audio ?? []).map((file) => ({ file, type: 'audio' })),
    ...(files.video ?? []).map((file) => ({ file, type: 'video' })),
  ];
  if (!mediaFiles.length) return response.status(400).json({ error: 'Selecione uma imagem, áudio ou vídeo.' });

  const connection = await pool.getConnection();
  const previousFiles = [];
  try {
    await connection.beginTransaction();
    for (const { file, type } of mediaFiles) {
      const [previous] = await connection.execute('SELECT file_name FROM recipe_media WHERE recipe_id = ? AND media_type = ? FOR UPDATE', [request.params.id, type]);
      previousFiles.push(...previous);
      await connection.execute('DELETE FROM recipe_media WHERE recipe_id = ? AND media_type = ?', [request.params.id, type]);
      await connection.execute(
        'INSERT INTO recipe_media (id, recipe_id, media_type, file_name, mime_type, file_size) VALUES (?, ?, ?, ?, ?, ?)',
        [randomUUID(), request.params.id, type, file.filename, file.mimetype, file.size],
      );
    }
    await connection.commit();
    await Promise.all(previousFiles.map((item) => new Promise((resolve) => unlink(join(uploadDirectory, item.file_name), resolve))));
    return response.status(201).json({ message: 'Mídia anexada à receita.' });
  } catch (error) {
    await connection.rollback();
    await Promise.all(mediaFiles.map(({ file }) => new Promise((resolve) => unlink(file.path, resolve))));
    return next(error);
  } finally {
    connection.release();
  }
});

app.get('/api/recipes/:recipeId/media/:mediaId', async (request, response, next) => {
  try {
    const [media] = await pool.execute(
      `SELECT m.file_name, m.mime_type FROM recipe_media m
       JOIN recipes r ON r.id = m.recipe_id
       WHERE m.id = ? AND r.id = ?`,
      [request.params.mediaId, request.params.recipeId],
    );
    if (!media.length) return response.status(404).json({ error: 'Arquivo não encontrado.' });
    return response.type(media[0].mime_type).sendFile(join(uploadDirectory, media[0].file_name));
  } catch (error) {
    return next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  return response.status(500).json({ error: 'Não foi possível concluir a solicitação.' });
});

await pool.query('SELECT 1');
await pool.query(`CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);
await pool.query(`CREATE TABLE IF NOT EXISTS pending_registrations (
  email VARCHAR(254) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);
await pool.query(`CREATE TABLE IF NOT EXISTS recipes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  title VARCHAR(140) NOT NULL,
  description TEXT NOT NULL,
  prep_time_minutes SMALLINT UNSIGNED NOT NULL,
  servings TINYINT UNSIGNED NOT NULL,
  difficulty ENUM('Fácil', 'Médio', 'Difícil') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_recipes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_recipes_user_created (user_id, created_at)
)`);
await pool.query(`CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id CHAR(36) NOT NULL PRIMARY KEY,
  recipe_id CHAR(36) NOT NULL,
  name VARCHAR(160) NOT NULL,
  quantity VARCHAR(80) NOT NULL DEFAULT '',
  position SMALLINT UNSIGNED NOT NULL,
  CONSTRAINT fk_recipe_ingredients_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  INDEX idx_recipe_ingredients_position (recipe_id, position)
)`);
await pool.query(`CREATE TABLE IF NOT EXISTS recipe_steps (
  id CHAR(36) NOT NULL PRIMARY KEY,
  recipe_id CHAR(36) NOT NULL,
  instruction TEXT NOT NULL,
  position SMALLINT UNSIGNED NOT NULL,
  CONSTRAINT fk_recipe_steps_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  INDEX idx_recipe_steps_position (recipe_id, position)
)`);
await pool.query(`CREATE TABLE IF NOT EXISTS recipe_media (
  id CHAR(36) NOT NULL PRIMARY KEY,
  recipe_id CHAR(36) NOT NULL,
  media_type ENUM('image', 'audio', 'video') NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_recipe_media_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  INDEX idx_recipe_media_recipe (recipe_id)
)`);
const [recipeMediaColumns] = await pool.query(
  `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recipe_media' AND COLUMN_NAME = 'media_type'`,
);
if (!recipeMediaColumns[0]?.COLUMN_TYPE?.includes("'image'")) {
  await pool.query("ALTER TABLE recipe_media MODIFY media_type ENUM('image', 'audio', 'video') NOT NULL");
}
await pool.query(`CREATE TABLE IF NOT EXISTS recipe_comments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  recipe_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  body VARCHAR(1000) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_recipe_comments_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  CONSTRAINT fk_recipe_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_recipe_comments_created (recipe_id, created_at)
)`);
await pool.query(`CREATE TABLE IF NOT EXISTS recipe_reports (
  id CHAR(36) NOT NULL PRIMARY KEY,
  recipe_id CHAR(36) NOT NULL,
  reporter_id CHAR(36) NOT NULL,
  comment_id CHAR(36) NULL,
  target_type ENUM('recipe', 'comment') NOT NULL,
  reason VARCHAR(80) NOT NULL,
  details VARCHAR(1000) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_recipe_reports_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  CONSTRAINT fk_recipe_reports_user FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_recipe_reports_comment FOREIGN KEY (comment_id) REFERENCES recipe_comments(id) ON DELETE CASCADE,
  INDEX idx_recipe_reports_created (created_at)
)`);
await pool.query(`CREATE TABLE IF NOT EXISTS recipe_ratings (
  recipe_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (recipe_id, user_id),
  CONSTRAINT fk_recipe_ratings_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  CONSTRAINT fk_recipe_ratings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`);
await pool.query(`CREATE TABLE IF NOT EXISTS saved_recipes (
  user_id CHAR(36) NOT NULL,
  recipe_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, recipe_id),
  CONSTRAINT fk_saved_recipes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_saved_recipes_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
)`);
await pool.query(`CREATE TABLE IF NOT EXISTS recipe_lists (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  name VARCHAR(80) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_recipe_lists_user_name (user_id, name),
  CONSTRAINT fk_recipe_lists_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`);
await pool.query(`CREATE TABLE IF NOT EXISTS recipe_list_items (
  list_id CHAR(36) NOT NULL,
  recipe_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (list_id, recipe_id),
  CONSTRAINT fk_recipe_list_items_list FOREIGN KEY (list_id) REFERENCES recipe_lists(id) ON DELETE CASCADE,
  CONSTRAINT fk_recipe_list_items_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
)`);
await pool.query(`CREATE TABLE IF NOT EXISTS shopping_list_items (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  name VARCHAR(160) NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_shopping_list_items_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_shopping_list_user_created (user_id, created_at)
)`);

app.listen(port, () => console.log(`Sabores da Terra API listening on port ${port}`));