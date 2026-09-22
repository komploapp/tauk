-- Fonction utilitaire pour incrémenter le score d'un joueur
create or replace function increment_player_score(p_player_id uuid, p_delta integer)
returns void
language plpgsql
as $$
begin
  update players set score = score + p_delta where id = p_player_id;
end;
$$;
