-- 1. Création de la séquence pour les matricules
CREATE SEQUENCE IF NOT EXISTS player_matricule_seq START 1;

-- 2. Ajout de la colonne avec la valeur par défaut basée sur la séquence
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS matricule text UNIQUE DEFAULT ('GC-' || lpad(nextval('player_matricule_seq')::text, 4, '0'));

-- La base PostgreSQL va automatiquement remplir cette colonne pour toutes les lignes existantes !
