-- Fonction sécurisée pour permettre aux administrateurs de supprimer un utilisateur de auth.users
-- La suppression d'un utilisateur dans auth.users va cascader sur la table profiles et le reste.

CREATE OR REPLACE FUNCTION admin_delete_user(p_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Vérifier si l'utilisateur qui exécute la fonction est un admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Accès refusé : Vous n''êtes pas administrateur.';
  END IF;

  -- Empêcher l'admin de se supprimer lui-même
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Accès refusé : Vous ne pouvez pas supprimer votre propre compte.';
  END IF;

  -- Supprimer l'utilisateur de la table auth.users (la suppression cascade automatiquement sur public.profiles, etc.)
  DELETE FROM auth.users WHERE id = p_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
