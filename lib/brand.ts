/**
 * 서비스명은 아직 확정 전이다. 화면에 노출되는 이름은 전부 여기서 가져오므로
 * 이름이 정해지면 이 상수만 바꾼다. "(가칭)" 같은 내부 메모는 이름에 넣지 않는다 —
 * 사용자에게는 탭 제목과 검색 결과에 그대로 나간다.
 *
 * 모델 목록은 data/models.ts가 단일 출처다. 문구에 모델 번호나 개수를
 * 하드코딩하지 않는다 — 모델이 늘면 문구가 바로 낡는다.
 */
export const SERVICE_NAME = "리바이스 데님 핏 데이터";

export const SERVICE_TAGLINE =
  "나와 비슷한 체형인 사람들이 실제로 입어본 결과로 사이즈를 고릅니다.";

/**
 * 사이트맵과 JSON-LD에 쓰는 절대 URL. basePath를 포함한다.
 * 커스텀 도메인으로 옮기면 여기와 next.config.ts의 basePath를 함께 고친다.
 */
export const SITE_URL = "https://ccccmkk.github.io/team5";

/**
 * GA4 측정 ID. 모든 페이지 HTML에 그대로 실려 나가는 공개 값이라 비밀이 아니다.
 * (브라우저에서 개발자도구를 열면 어느 사이트든 보이는 종류의 값이다.)
 *
 * 소스에 두는 이유: 저장소 변수/시크릿 등록은 admin 권한이 필요한데 팀원 대부분은
 * collaborator라 손댈 수 없다. 값이 공개라 숨겨서 얻는 것도 없으므로, 아무나
 * 고칠 수 있는 곳에 둔다. NEXT_PUBLIC_GA_ID를 주면 그쪽이 우선한다.
 */
export const GA_MEASUREMENT_ID = "G-SYK7MN1BHR";
