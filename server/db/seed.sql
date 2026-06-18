-- server/db/seed.sql
-- Development fixtures for Revu: one test commerce + 15 fictional reviews.
--
-- Idempotent: re-running resets this commerce's data to a known state.
-- Run manually with `npm run db:seed`. Never run this in production.

BEGIN;

-- Remove any previous test commerce first; ON DELETE CASCADE also clears its
-- avis/alertes, so the counts below stay exact on every re-run.
DELETE FROM commerces WHERE email = 'test@revu.fr';

-- Test commerce with a fixed UUID so the reviews below can reference it directly.
INSERT INTO commerces (id, nom, email, password_hash, slug) VALUES
  ('11111111-1111-1111-1111-111111111111', 'La Brasserie du Centre', 'test@revu.fr', '$2b$10$fake_hash_for_dev', 'brasserie-du-centre');

-- 15 reviews:
--   * 8 mention "steak"   with a global rating of 1 or 2 (-> should trigger an alert later)
--   * 4 mention "accueil" with a global rating of 4 or 5
--   * 3 mention "attente" with a global rating of 2 or 3
INSERT INTO avis (commerce_id, note_globale, note_qualite, note_service, note_attente, commentaire) VALUES
  -- "steak" (8)
  ('11111111-1111-1111-1111-111111111111', 1, 1, 2, 2, 'Le steak était immangeable, beaucoup trop cuit.'),
  ('11111111-1111-1111-1111-111111111111', 2, 2, 3, 3, 'Steak trop dur et froid, vraiment décevant.'),
  ('11111111-1111-1111-1111-111111111111', 1, 1, 2, 2, 'Steak carbonisé, la qualité est catastrophique.'),
  ('11111111-1111-1111-1111-111111111111', 2, 2, 2, 3, 'Le steak manquait cruellement de cuisson, dommage.'),
  ('11111111-1111-1111-1111-111111111111', 1, 1, 1, 2, 'Steak immangeable encore une fois, à éviter absolument.'),
  ('11111111-1111-1111-1111-111111111111', 2, 2, 3, 2, 'Steak fade et beaucoup trop gras, grosse déception.'),
  ('11111111-1111-1111-1111-111111111111', 1, 1, 2, 1, 'Steak servi complètement froid, expérience désastreuse.'),
  ('11111111-1111-1111-1111-111111111111', 2, 2, 2, 2, 'Les steaks sont systématiquement ratés dans ce restaurant.'),
  -- "accueil" (4)
  ('11111111-1111-1111-1111-111111111111', 5, 5, 5, 4, 'Accueil chaleureux et personnel vraiment adorable.'),
  ('11111111-1111-1111-1111-111111111111', 4, 4, 5, 4, 'Très bon accueil, équipe souriante et attentionnée.'),
  ('11111111-1111-1111-1111-111111111111', 5, 5, 4, 5, 'Accueil parfait, on se sent comme à la maison.'),
  ('11111111-1111-1111-1111-111111111111', 4, 4, 4, 4, 'Accueil agréable et service vraiment soigné.'),
  -- "attente" (3)
  ('11111111-1111-1111-1111-111111111111', 2, 3, 3, 1, 'Attente beaucoup trop longue avant le service.'),
  ('11111111-1111-1111-1111-111111111111', 3, 3, 3, 2, 'Une attente un peu longue mais globalement correct.'),
  ('11111111-1111-1111-1111-111111111111', 3, 4, 3, 2, 'Attente raisonnable malgré la forte affluence.');

COMMIT;
