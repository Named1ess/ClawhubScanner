// Popup Script
document.addEventListener('DOMContentLoaded', function() {
    const skillNameInput = document.getElementById('skillName');
    const scanBtn = document.getElementById('scanBtn');
    const resultSection = document.getElementById('result');
    const loadingSection = document.getElementById('loading');
    const errorSection = document.getElementById('error');
    const errorMessage = document.getElementById('errorMessage');

    // Scan button click event
    scanBtn.addEventListener('click', scanSkill);

    // Input box enter event
    skillNameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            scanSkill();
        }
    });

    // Scan skill
    async function scanSkill() {
        const skillName = skillNameInput.value.trim();

        if (!skillName) {
            showError('Enter skill name');
            return;
        }

        // Hide other sections
        resultSection.style.display = 'none';
        errorSection.style.display = 'none';
        loadingSection.style.display = 'block';

        try {
            const response = await fetch(`https://clawdex.koi.security/api/skill/${encodeURIComponent(skillName)}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            showResult(data);

        } catch (error) {
            console.error('API Error:', error);
            showError(error.message);
        } finally {
            loadingSection.style.display = 'none';
        }
    }

    // Show result
    function showResult(data) {
        if (!data) {
            showError('No information found for this skill');
            return;
        }

        // Handle verdict display correctly (benign, malicious, unknown)
        const verdictTexts = {
            'malicious': { text: 'Dangerous ⚠️', class: 'verdict-malicious' },
            'benign': { text: 'Safe ✅', class: 'verdict-safe' },
            'unknown': { text: 'Unknown ⚠️', class: 'verdict-unknown' }
        };
        const verdictInfo = verdictTexts[data.verdict] || verdictTexts['unknown'];
        const verdict = verdictInfo.text;
        const verdictClass = verdictInfo.class;

        let html = `
            <div class="result-header">
                <span class="result-skill-name">${escapeHtml(data.skill_name || 'Unknown')}</span>
                <span class="verdict-badge ${verdictClass}">${verdict}</span>
            </div>
            <div class="result-details">
        `;

        // If malicious skill, show details
        if (data.verdict === 'malicious' && data.malicious_explanation) {
            html += `
                <div class="detail-section">
                    <div class="detail-title danger">⚠️ Malicious Explanation</div>
                    <div class="detail-content">${escapeHtml(data.malicious_explanation)}</div>
                </div>
            `;
        }

        // Show remote instruction URLs
        if (data.remote_instruction_urls && data.remote_instruction_urls.length > 0) {
            html += `
                <div class="detail-section">
                    <div class="detail-title warning">📜 Remote Instruction URLs</div>
                    <div class="detail-content">
                        <ul>
                            ${data.remote_instruction_urls.map(url => {
                                const safeUrl = isSafeUrl(url);
                                return safeUrl
                                    ? `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a></li>`
                                    : `<li style="color: #ff6b6b;" title="Unsafe URL format">${escapeHtml(url)} &#9888;</li>`;
                            }).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }

        // Show remote script URLs
        if (data.remote_script_urls && data.remote_script_urls.length > 0) {
            html += `
                <div class="detail-section">
                    <div class="detail-title warning">📦 Remote Script URLs</div>
                    <div class="detail-content">
                        <ul>
                            ${data.remote_script_urls.map(url => {
                                const safeUrl = isSafeUrl(url);
                                return safeUrl
                                    ? `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a></li>`
                                    : `<li style="color: #ff6b6b;" title="Unsafe URL format">${escapeHtml(url)} &#9888;</li>`;
                            }).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }

        // Show installed packages
        if (data.installed_packages && data.installed_packages.length > 0) {
            html += `
                <div class="detail-section">
                    <div class="detail-title warning">📦 Installed Packages</div>
                    <div class="detail-content">
                        <ul>
                            ${data.installed_packages.map(pkg => `
                                <li>${escapeHtml(pkg.name)} (${escapeHtml(pkg.ecosystem)})</li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        resultSection.innerHTML = html;
        resultSection.style.display = 'block';
    }

    // Show error
    function showError(message) {
        errorMessage.textContent = message || 'Unknown error occurred';
        errorSection.style.display = 'block';
        resultSection.style.display = 'none';
    }

    // HTML escape
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // URL safety validation - prevent javascript: and data: protocol attacks
    function isSafeUrl(url) {
        if (!url || typeof url !== 'string') return false;
        // Only allow http/https protocols, and protocol-relative URLs
        return /^https?:\/\//i.test(url) || /^\/\//.test(url);
    }
});
