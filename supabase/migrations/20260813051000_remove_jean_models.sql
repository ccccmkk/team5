-- 모델 카탈로그의 단일 출처는 data/models.ts로 유지한다.
-- 사용자 생성 데이터인 fit_reviews만 Supabase에 저장한다.
-- 기존 후기 데이터는 그대로 보존하면서 jean_models FK와 테이블만 제거한다.

alter table fit_reviews
  drop constraint if exists fit_reviews_model_id_fkey;

-- 코드에 정의된 현재 12개 모델만 DB에서도 허용한다.
alter table fit_reviews
  add constraint fit_reviews_model_id_check
  check (model_id in ('501', '502', '505', '511', '512', '514', '517', '527', '550', '559', '560', '569'));

-- 더 이상 앱의 원본 데이터로 사용하지 않는 중복 카탈로그 테이블을 제거한다.
drop table if exists jean_models;
