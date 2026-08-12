alter table jean_models   enable row level security;
alter table body_profiles enable row level security;
alter table fit_reviews   enable row level security;

-- 모델 정보는 누구나 읽는다. 쓰기 정책이 없으므로 시드(service role)만 넣을 수 있다.
create policy models_public_read on jean_models
  for select using (true);

-- 체형 프로필은 본인만 읽고 쓴다.
-- 후기에 스냅샷이 박혀 있어 남의 프로필을 읽을 이유가 없다 (스펙 §6.3).
create policy profile_own_read on body_profiles
  for select using (auth.uid() = user_id);
create policy profile_own_insert on body_profiles
  for insert with check (auth.uid() = user_id);
create policy profile_own_update on body_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 후기는 누구나 읽고, 쓰기는 본인 행만. 시드 플래그는 사용자가 켤 수 없다.
create policy reviews_public_read on fit_reviews
  for select using (true);
create policy reviews_own_insert on fit_reviews
  for insert with check (auth.uid() = user_id and is_seed = false);
create policy reviews_own_update on fit_reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy reviews_own_delete on fit_reviews
  for delete using (auth.uid() = user_id);
