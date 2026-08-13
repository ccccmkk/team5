create table jean_models (
  id          text primary key,
  name        text not null,
  fit_type    text not null,
  description text not null default '',
  size_chart  jsonb not null,
  created_at  timestamptz not null default now()
);

create table body_profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  nickname   text     not null check (char_length(nickname) between 2 and 12),
  height_cm  smallint not null check (height_cm  between 120 and 220),
  weight_kg  smallint not null check (weight_kg  between 30  and 200),
  waist_inch smallint not null check (waist_inch between 22  and 46),
  thigh_cm   smallint          check (thigh_cm   between 30  and 90),
  hip_cm     smallint          check (hip_cm     between 60  and 140),
  inseam_cm  smallint          check (inseam_cm  between 50  and 110),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table fit_reviews (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid     references auth.users(id) on delete cascade,
  model_id       text     not null references jean_models(id),
  purchased_size smallint not null check (purchased_size between 22 and 46),
  waist_fit      smallint not null check (waist_fit  between -2 and 2),
  thigh_fit      smallint not null check (thigh_fit  between -2 and 2),
  hip_fit        smallint not null check (hip_fit    between -2 and 2),
  length_fit     smallint not null check (length_fit between -2 and 2),
  overall        smallint not null check (overall    between  1 and 5),
  comment        text     not null default '' check (char_length(comment) <= 300),
  snapshot       jsonb    not null,
  is_seed        boolean  not null default false,
  created_at     timestamptz not null default now(),
  -- 시드 후기는 실제 계정이 없다. 플래그와 소유자가 어긋나지 않게 강제한다.
  constraint seed_has_no_user check (
    (is_seed and user_id is null) or (not is_seed and user_id is not null)
  )
);

-- 같은 사람이 같은 모델의 같은 사이즈로 후기를 두 번 쓰지 못하게 한다.
-- 시드 행(user_id null)에는 적용하지 않는다.
create unique index fit_reviews_one_per_user_model_size
  on fit_reviews (user_id, model_id, purchased_size)
  where user_id is not null;

create index fit_reviews_by_model on fit_reviews (model_id, created_at desc);
