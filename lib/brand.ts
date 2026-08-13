/**
 * 서비스명은 아직 가칭이다. 화면에 노출되는 이름은 전부 여기서 가져온다.
 * 이름이 정해지면 이 파일만 바꾼다.
 *
 * 대상 제품은 리바이스 데님 12종이다. 모델 목록은 data/models.ts가 단일 출처이므로
 * 문구에 모델 번호를 하드코딩하지 않는다 — 모델이 늘면 문구가 바로 낡는다.
 */
export const SERVICE_NAME = "리바이스 사이즈 핏 정보(가칭)";

export const SERVICE_TAGLINE =
  "나와 비슷한 체형인 사람들이 실제로 입어본 결과로 사이즈를 고릅니다.";

/**
 * 사이트맵과 JSON-LD에 쓰는 절대 URL. basePath를 포함한다.
 * 커스텀 도메인으로 옮기면 여기와 next.config.ts의 basePath를 함께 고친다.
 */
export const SITE_URL = "https://ccccmkk.github.io/team5";
