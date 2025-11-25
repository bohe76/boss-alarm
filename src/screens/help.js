import { loadJsonContent } from '../api-service.js';

export function initHelpScreen(DOM) {
    // Directly load feature guide content when opening help screen
    (async () => {
        const helpData = await loadJsonContent(`docs/feature_guide.json?v=${window.APP_VERSION}`);
        if (helpData && DOM.featureGuideContent) {
            let html = '';
            helpData.forEach((section, index) => {
                const isOpen = index === 0 ? 'open' : ''; // Add 'open' attribute to the first item
                html += `
                    <details class="help-section" ${isOpen}>
                        <summary class="help-summary">${section.title}</summary>
                        <div class="help-content">
                            ${section.content.map(p => `<p>${p}</p>`).join('')}
                            ${section.sub_sections ? section.sub_sections.map(sub => `
                                <details class="help-sub-section">
                                    <summary class="help-sub-summary">${sub.title}</summary>
                                    <div class="help-sub-content">
                                        ${sub.content.map(p => `<p>${p}</p>`).join('')}
                                    </div>
                                </details>
                            `).join('') : ''}
                        </div>
                    </details>
                `;
            });
            DOM.featureGuideContent.innerHTML = html;
        } else if (DOM.featureGuideContent) {
            DOM.featureGuideContent.innerHTML = `<p>도움말 콘텐츠를 불러오는 데 실패했습니다.</p>`;
        }
    })();
}
