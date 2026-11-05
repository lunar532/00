// 참고자료: GitHub에서 쓰기 좋은 오픈소스 저장소 목록.
// refs.html은 방문할 때마다 이 중 10개를 무작위로 골라 보여줘요. 항목을 늘리려면 여기에 추가하세요.
window.UL_REFS = [
  // 3D · 스캔
  { repo: 'mrdoob/three.js', cat: '3D', desc: '웹 3D의 표준 라이브러리. 이 사이트의 3D 뷰어도 이걸로 만들었어요.' },
  { repo: 'google/model-viewer', cat: '3D', desc: '<model-viewer> 태그 하나로 GLB 모델을 웹페이지에 띄우고 AR로도 보여줘요.' },
  { repo: 'BabylonJS/Babylon.js', cat: '3D', desc: '게임 엔진급 기능을 갖춘 웹 3D 엔진. 물리, 에디터, 인스펙터 포함.' },
  { repo: 'pmndrs/react-three-fiber', cat: '3D', desc: 'React 컴포넌트처럼 three.js 장면을 만드는 방법.' },
  { repo: 'donmccurdy/glTF-Transform', cat: '3D', desc: 'GLB 파일 압축, 최적화, 변환을 명령줄이나 코드로 처리해요. 스캔 파일 용량 줄이기에 좋아요.' },
  { repo: 'KhronosGroup/glTF-Sample-Assets', cat: '3D', desc: 'glTF 공식 샘플 모델 모음. 뷰어 테스트용으로 좋아요.' },
  { repo: 'mkkellogg/GaussianSplats3D', cat: '3D', desc: '가우시안 스플래팅(사진 기반 3D 캡처)을 three.js로 웹에서 보여줘요.' },
  { repo: 'playcanvas/supersplat', cat: '3D', desc: '가우시안 스플랫을 브라우저에서 편집하고 정리하는 도구.' },
  { repo: 'isl-org/Open3D', cat: '3D', desc: '점구름과 메시 처리 라이브러리(Python/C++). 스캔 데이터 정리에 많이 써요.' },
  { repo: 'cnr-isti-vclab/meshlab', cat: '3D', desc: '3D 스캔 메시를 다듬고 구멍을 메우는 데스크톱 프로그램.' },
  { repo: 'nerfstudio-project/nerfstudio', cat: '3D', desc: '사진·영상으로 NeRF 3D 장면을 만드는 프레임워크.' },
  { repo: 'Leaflet/Leaflet', cat: '지도', desc: '가볍고 쉬운 웹 지도 라이브러리. 이 사이트의 지도도 이걸로 만들었어요.' },
  { repo: 'maplibre/maplibre-gl-js', cat: '지도', desc: '건물을 3D로 세우고 기울여 보는 벡터 지도. three.js 모델을 지도 위에 직접 올릴 수도 있어요.' },
  { repo: 'visgl/deck.gl', cat: '지도', desc: '지도 위에 대량의 데이터와 3D 레이어를 그리는 프레임워크.' },
  { repo: 'openlayers/openlayers', cat: '지도', desc: '기능이 아주 많은 오픈소스 웹 지도 라이브러리.' },
  { repo: 'CesiumGS/cesium', cat: '3D', desc: '지구본과 지도 위에 3D 데이터를 올리는 엔진.' },

  // 웹 기본기
  { repo: 'vitejs/vite', cat: '웹', desc: '빠른 개발 서버와 빌드 도구. 새 프론트엔드 프로젝트의 출발점.' },
  { repo: 'withastro/astro', cat: '웹', desc: '콘텐츠 중심 정적 사이트를 빠르게 만드는 프레임워크. GitHub Pages 배포가 쉬워요.' },
  { repo: 'vercel/next.js', cat: '웹', desc: 'React 기반 풀스택 웹 프레임워크.' },
  { repo: 'sveltejs/svelte', cat: '웹', desc: '컴파일 방식이라 가볍고 빠른 UI 프레임워크.' },
  { repo: 'vuejs/core', cat: '웹', desc: 'Vue 3 본체. 배우기 쉬운 UI 프레임워크.' },
  { repo: 'alpinejs/alpine', cat: '웹', desc: 'HTML에 속성 몇 개로 동작을 붙이는 초경량 라이브러리. 빌드 없이 써요.' },
  { repo: 'bigskysoftware/htmx', cat: '웹', desc: 'JavaScript 없이 HTML 속성만으로 서버와 주고받는 화면을 만들어요.' },
  { repo: 'tailwindlabs/tailwindcss', cat: '웹', desc: '클래스 이름으로 바로 스타일을 입히는 CSS 프레임워크.' },
  { repo: 'shoelace-style/shoelace', cat: '웹', desc: '어떤 프레임워크에서도 쓰는 웹 컴포넌트 UI 모음.' },

  // 백엔드 · 데이터
  { repo: 'supabase/supabase', cat: '백엔드', desc: '이 사이트의 가입·게시판을 맡은 오픈소스 Firebase 대안. Postgres 기반.' },
  { repo: 'pocketbase/pocketbase', cat: '백엔드', desc: '실행 파일 하나로 DB, 인증, 파일 저장까지 되는 백엔드.' },
  { repo: 'nodejs/node', cat: '백엔드', desc: 'JavaScript를 서버에서 돌리는 런타임.' },
  { repo: 'oven-sh/bun', cat: '백엔드', desc: '빠른 JavaScript 런타임 + 패키지 매니저 + 번들러.' },
  { repo: 'honojs/hono', cat: '백엔드', desc: 'Cloudflare Workers 등 어디서나 도는 초경량 웹 서버 프레임워크.' },

  // 그래픽 · 애니메이션
  { repo: 'greensock/GSAP', cat: '그래픽', desc: '부드러운 웹 애니메이션의 대표 라이브러리.' },
  { repo: 'pixijs/pixijs', cat: '그래픽', desc: 'WebGL로 빠르게 그리는 2D 그래픽 엔진.' },
  { repo: 'airbnb/lottie-web', cat: '그래픽', desc: 'After Effects 애니메이션을 웹에서 그대로 재생해요.' },
  { repo: 'd3/d3', cat: '그래픽', desc: '데이터 시각화를 직접 그리는 라이브러리.' },
  { repo: 'chartjs/Chart.js', cat: '그래픽', desc: '간단한 차트를 빠르게 넣을 때 쓰는 라이브러리.' },
  { repo: 'mermaid-js/mermaid', cat: '그래픽', desc: '글로 쓰면 다이어그램으로 그려줘요. GitHub README에서도 바로 보여요.' },
  { repo: 'excalidraw/excalidraw', cat: '그래픽', desc: '손그림 느낌의 화이트보드. 집 배치 스케치에도 좋아요.' },
  { repo: 'dimsemenov/PhotoSwipe', cat: '그래픽', desc: '터치로 확대·넘기기 되는 사진 갤러리.' },
  { repo: 'nolimits4web/swiper', cat: '그래픽', desc: '모바일 터치 슬라이더의 표준.' },

  // AI 도구 (내 컴퓨터에서 실행)
  { repo: 'comfyanonymous/ComfyUI', cat: 'AI', desc: '노드를 이어서 이미지 생성 과정을 짜는 Stable Diffusion 도구. 내 컴퓨터에서 돌아가요.' },
  { repo: 'lllyasviel/stable-diffusion-webui-forge', cat: 'AI', desc: '메모리를 덜 쓰는 Stable Diffusion WebUI. 그래픽카드 VRAM이 적을 때 좋아요.' },
  { repo: 'AUTOMATIC1111/stable-diffusion-webui', cat: 'AI', desc: '가장 널리 쓰인 Stable Diffusion 웹 화면. 확장 기능이 많아요.' },
  { repo: 'ollama/ollama', cat: 'AI', desc: '대화형 AI 모델을 내 컴퓨터에서 명령 한 줄로 실행.' },
  { repo: 'ggml-org/llama.cpp', cat: 'AI', desc: 'CPU만으로도 AI 언어 모델을 돌리는 엔진.' },

  // GitHub 활용
  { repo: 'github/gitignore', cat: 'GitHub', desc: '언어·도구별 .gitignore 모음. 새 저장소 만들 때 복사해 쓰세요.' },
  { repo: 'actions/starter-workflows', cat: 'GitHub', desc: 'GitHub Actions 자동화 예제 모음. Pages 배포 예제도 있어요.' },
  { repo: 'peaceiris/actions-gh-pages', cat: 'GitHub', desc: '빌드 결과를 GitHub Pages로 올려주는 Action.' },
  { repo: 'sindresorhus/awesome', cat: 'GitHub', desc: '분야별 "awesome" 추천 목록의 목록.' },
  { repo: 'public-apis/public-apis', cat: 'GitHub', desc: '무료로 쓸 수 있는 공개 API 모음.' },
  { repo: 'kamranahmedse/developer-roadmap', cat: 'GitHub', desc: '분야별 개발 공부 로드맵.' },
  { repo: 'EbookFoundation/free-programming-books', cat: 'GitHub', desc: '무료 프로그래밍 책 모음(한국어 포함).' },
  { repo: 'trekhleb/javascript-algorithms', cat: 'GitHub', desc: 'JavaScript로 구현한 알고리즘·자료구조와 설명.' },
  { repo: 'prettier/prettier', cat: 'GitHub', desc: '코드를 자동으로 보기 좋게 정리해 주는 포매터.' },
  { repo: 'docsifyjs/docsify', cat: 'GitHub', desc: 'Markdown 파일만으로 문서 사이트를 만들어요. 빌드가 필요 없어요.' },
];
