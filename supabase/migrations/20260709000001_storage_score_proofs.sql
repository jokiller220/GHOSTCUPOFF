-- Création du bucket 'score-proofs' s'il n'existe pas
INSERT INTO storage.buckets (id, name, public)
VALUES ('score-proofs', 'score-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Autoriser tout le monde à lire les fichiers du bucket (Public)
CREATE POLICY "Les preuves sont publiques"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'score-proofs' );

-- Autoriser les utilisateurs connectés à envoyer des preuves
CREATE POLICY "Les joueurs peuvent uploader des preuves"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'score-proofs' );

-- Autoriser les utilisateurs à modifier/supprimer leurs propres preuves (optionnel)
CREATE POLICY "Les joueurs peuvent modifier leurs preuves"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'score-proofs' AND auth.uid() = owner )
WITH CHECK ( bucket_id = 'score-proofs' AND auth.uid() = owner );

CREATE POLICY "Les joueurs peuvent supprimer leurs preuves"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'score-proofs' AND auth.uid() = owner );
