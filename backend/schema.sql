CREATE DATABASE IF NOT EXISTS sabores_da_terra
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sabores_da_terra;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pending_registrations (
  email VARCHAR(254) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recipes (
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
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id CHAR(36) NOT NULL PRIMARY KEY,
  recipe_id CHAR(36) NOT NULL,
  name VARCHAR(160) NOT NULL,
  quantity VARCHAR(80) NOT NULL DEFAULT '',
  position SMALLINT UNSIGNED NOT NULL,
  CONSTRAINT fk_recipe_ingredients_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  INDEX idx_recipe_ingredients_position (recipe_id, position)
);

CREATE TABLE IF NOT EXISTS recipe_steps (
  id CHAR(36) NOT NULL PRIMARY KEY,
  recipe_id CHAR(36) NOT NULL,
  instruction TEXT NOT NULL,
  position SMALLINT UNSIGNED NOT NULL,
  CONSTRAINT fk_recipe_steps_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  INDEX idx_recipe_steps_position (recipe_id, position)
);

CREATE TABLE IF NOT EXISTS recipe_media (
  id CHAR(36) NOT NULL PRIMARY KEY,
  recipe_id CHAR(36) NOT NULL,
  media_type ENUM('image', 'audio', 'video') NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_recipe_media_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  INDEX idx_recipe_media_recipe (recipe_id)
);

CREATE TABLE IF NOT EXISTS recipe_comments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  recipe_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  body VARCHAR(1000) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_recipe_comments_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  CONSTRAINT fk_recipe_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_recipe_comments_created (recipe_id, created_at)
);

CREATE TABLE IF NOT EXISTS recipe_reports (
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
);

CREATE TABLE IF NOT EXISTS recipe_ratings (
  recipe_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (recipe_id, user_id),
  CONSTRAINT fk_recipe_ratings_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  CONSTRAINT fk_recipe_ratings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS saved_recipes (
  user_id CHAR(36) NOT NULL,
  recipe_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, recipe_id),
  CONSTRAINT fk_saved_recipes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_saved_recipes_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recipe_lists (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  name VARCHAR(80) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_recipe_lists_user_name (user_id, name),
  CONSTRAINT fk_recipe_lists_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recipe_list_items (
  list_id CHAR(36) NOT NULL,
  recipe_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (list_id, recipe_id),
  CONSTRAINT fk_recipe_list_items_list FOREIGN KEY (list_id) REFERENCES recipe_lists(id) ON DELETE CASCADE,
  CONSTRAINT fk_recipe_list_items_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shopping_list_items (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  name VARCHAR(160) NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_shopping_list_items_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_shopping_list_user_created (user_id, created_at)
);