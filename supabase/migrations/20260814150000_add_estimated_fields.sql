-- 사용자 피드백: "정확한 허벅지 둘레를 몰라서 입력을 못 하겠다".
-- 줄자 없이 고르는 체형 옵션(슬림/표준/발달)으로도 치수를 채울 수 있게 하면서,
-- 그렇게 채운 항목이 무엇인지 남긴다.
--
-- 직접 잰 값과 옵션에서 추정한 값을 구분하지 않으면 화면의 "입력 정확도"가
-- 실제보다 높게 나온다. 나중에 "옵션으로 채운 사람이 실제로 후기를 남겼는가"를
-- 볼 때도 이 구분이 필요하다.
alter table body_profiles
  add column estimated_fields text[] not null default '{}';

alter table body_profiles
  add constraint estimated_fields_known check (
    estimated_fields <@ array['thighCm', 'hipCm', 'inseamCm']
  );

comment on column body_profiles.estimated_fields is
  '체형 옵션에서 추정해 채운 항목. 직접 입력한 값은 여기 들어가지 않는다.';
