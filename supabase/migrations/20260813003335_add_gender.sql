-- 팀 피드백: 성별 구분이 없으면 체형 분포가 지나치게 넓어져
-- "나와 비슷한 사람"의 의미가 흐려진다.
--
-- 테스트 프로젝트에서는 GitHub Actions가 migration을 실제 Supabase DB에 적용한다.
-- 운영 전환 시에도 migration 파일을 DB 스키마의 단일 출처로 유지한다.
-- 기존 행에는 값이 없으므로 nullable로 둔다. 입력 강제는 폼에서 한다.
alter table body_profiles
  add column if not exists gender text check (gender in ('male', 'female'));

-- 후기의 snapshot(jsonb)에도 gender가 들어간다. 스키마 변경은 필요 없다.
comment on column body_profiles.gender is
  '비교 대상을 거르는 필터. 치수가 아니므로 유사도 가중치에는 들어가지 않는다.';
