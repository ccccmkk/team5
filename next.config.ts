import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // GitHub Pages는 정적 파일만 서빙한다. 서버 컴포넌트의 요청 시점 페칭,
  // 서버 액션, 미들웨어, 라우트 핸들러를 쓸 수 없다.
  output: "export",

  // 프로젝트 페이지(https://<계정>.github.io/team5/)라 하위 경로가 붙는다.
  // <계정>.github.io 저장소나 커스텀 도메인을 쓰면 이 줄을 지운다.
  basePath: isProd ? "/team5" : "",

  // Pages가 /models/501 요청에 /models/501/index.html을 주게 한다.
  // 빼먹으면 새로고침이나 직접 링크에서 404가 난다.
  trailingSlash: true,

  images: { unoptimized: true },
};

export default nextConfig;
