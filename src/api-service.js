// src/api-service.js

export async function getShortUrl(longUrl) {
    // TinyURL의 무료 API 주소
    const apiUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`;
    
    try {
        // fetch: API에 네트워크 요청(GET)을 보냄
        const response = await fetch(apiUrl);
        
        if (response.ok) { // 응답이 성공(200)이면
            const shortUrl = await response.text(); // 응답 내용을 텍스트로 받음 (이게 단축 URL)
            return shortUrl;
        } else {
            // 서버가 404, 500 등 에러를 반환한 경우
            throw new Error('API 응답 실패');
        }
    } catch (error) {
        // 네트워크 연결 오류 또는 위에서 발생시킨 에러
        console.error("URL 단축 실패:", error);
        return null; // 실패 시 null 반환
    }
}

// Helper function to load markdown content
export async function loadMarkdownContent(filePath) {
    try {
        const cacheBuster = Date.now(); // Or a version number if preferred
        const response = await fetch(`${filePath}?v=${cacheBuster}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const markdown = await response.text();
        return markdown;
    } catch (error) {
        console.error(`Failed to load markdown from ${filePath}:`, error);
        return `콘텐츠를 불러오는 데 실패했습니다: ${error.message}`;
    }
}
