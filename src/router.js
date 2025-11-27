// src/router.js
const routes = {}; // 화면 정보를 담을 라우팅 테이블

export function getRoute(screenId) {
    return routes[screenId];
}

export function registerRoute(screenId, screenModule) {
    routes[screenId] = screenModule;
}
