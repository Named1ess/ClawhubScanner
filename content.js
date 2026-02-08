// ClawhubScanner Content Script
// Detects clawhub install commands on web pages and provides security scanning

(function() {
    'use strict';

    // Tooltip element
    let tooltip = null;
    let hideTimeout = null;
    const processedElements = new WeakSet(); // Track processed elements

    // Create tooltip element
    function createTooltip() {
        if (tooltip) return tooltip;

        tooltip = document.createElement('div');
        tooltip.id = 'clawhub-scanner-tooltip';
        tooltip.style.cssText = 
            'position: fixed;' +
            'z-index: 2147483647;' +
            'max-width: 450px;' +
            'min-width: 280px;' +
            'background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);' +
            'color: #eee;' +
            'padding: 16px;' +
            'border-radius: 12px;' +
            'box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1);' +
            'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;' +
            'font-size: 14px;' +
            'line-height: 1.6;' +
            'display: none;' +
            'pointer-events: auto;' +
            'backdrop-filter: blur(10px);' +
            'transition: opacity 0.2s ease;';
        
        // Add mouse enter/leave events to keep tooltip visible
        tooltip.addEventListener('mouseenter', function() {
            if (hideTimeout) {
                clearTimeout(hideTimeout);
                hideTimeout = null;
            }
        });
        
        tooltip.addEventListener('mouseleave', function() {
            hideTooltip();
        });
        
        document.body.appendChild(tooltip);
        return tooltip;
    }

    // Show tooltip
    function showTooltip(element, skillName) {
        const tip = createTooltip();
        
        // Clear hide timeout to prevent immediate hiding
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
        
        // Show loading state
        tip.innerHTML = 
            '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">' +
                '<span style="font-size: 18px;">&#128269;</span>' +
                '<strong style="font-size: 16px; color: #667eea;">ClawhubScanner</strong>' +
            '</div>' +
            '<div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px;">' +
                'Querying security info for skill "<strong style="color: #fff;">' + escapeHtml(skillName) + '</strong>"...' +
            '</div>';
        
        tip.style.display = 'block';

        // Calculate position - use viewport coordinates + fixed positioning
        const rect = element.getBoundingClientRect();

        // Center below the element
        let left = rect.left + (rect.width / 2) - 175;
        let top = rect.bottom + 15;

        // Boundary check
        if (left < 10) left = 10;
        if (left + 450 > window.innerWidth) left = window.innerWidth - 460;
        if (top + 200 > window.innerHeight) {
            // If not enough space below, show above the element
            top = rect.top - 200;
        }
        if (top < 10) top = 10;  // Ensure not exceeding top

        tip.style.left = left + 'px';
        tip.style.top = top + 'px';

        // Call API
        fetchSkillInfo(skillName, tip);
    }

    // Hide tooltip
    function hideTooltip() {
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    // Delayed hide tooltip
    function delayedHideTooltip() {
        if (hideTimeout) {
            clearTimeout(hideTimeout);
        }
        hideTimeout = setTimeout(function() {
            hideTooltip();
        }, 500);
    }

    // Call API to get skill info
    function fetchSkillInfo(skillName, tipElement) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'https://clawdex.koi.security/api/skill/' + encodeURIComponent(skillName), true);
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        var data = JSON.parse(xhr.responseText);
                        updateTooltipContent(tipElement, data, skillName);
                    } catch (e) {
                        showError(tipElement, 'Failed to parse response');
                    }
                } else {
                    showError(tipElement, 'HTTP Error: ' + xhr.status);
                }
            }
        };
        
        xhr.onerror = function() {
            showError(tipElement, 'Network request failed');
        };
        
        xhr.send();
    }

    // Update tooltip content
    function updateTooltipContent(tipElement, data, skillName) {
        var verdict = data.verdict || 'unknown';
        var isMalicious = verdict === 'malicious';
        var verdictText = isMalicious ? 'Dangerous' : (verdict === 'benign' ? 'Safe' : 'Unknown');
        var verdictEmoji = isMalicious ? '&#9888;' : '&#9989;';
        
        var html = 
            '<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">' +
                '<div style="display: flex; align-items: center; gap: 8px;">' +
                    '<span style="font-size: 18px;">&#128737;</span>' +
                    '<strong style="font-size: 16px;">' + escapeHtml(data.skill_name || skillName) + '</strong>' +
                '</div>' +
                '<span style="background: ' + (isMalicious ? 'linear-gradient(135deg, #eb3349, #f45c43)' : 'linear-gradient(135deg, #11998e, #38ef7d)') + '; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; color: white;">' +
                    verdictEmoji + ' ' + verdictText +
                '</span>' +
            '</div>';

        // If malicious skill, show details
        if (isMalicious && data.malicious_explanation) {
            html += 
                '<div style="background: rgba(255, 0, 0, 0.1); padding: 12px; border-radius: 8px; margin-bottom: 10px; border-left: 3px solid #ff6b6b;">' +
                    '<strong style="color: #ff6b6b;">&#9888; Malicious Explanation:</strong>' +
                    '<p style="margin: 8px 0 0 0; color: #ffa5a5;">' + escapeHtml(data.malicious_explanation) + '</p>' +
                '</div>';
        }

        // Show remote script URLs
        if (data.remote_script_urls && data.remote_script_urls.length > 0) {
            html += '<div style="margin-top: 10px;"><strong style="color: #ffd93d;">&#128230; Remote Script URLs:</strong>';
            html += '<ul style="margin: 8px 0 0 0; padding-left: 20px;">';
            for (var i = 0; i < data.remote_script_urls.length; i++) {
                html += '<li style="word-break: break-all; margin-bottom: 4px;"><a href="' + escapeHtml(data.remote_script_urls[i]) + '" target="_blank" style="color: #6bcfff;">' + escapeHtml(data.remote_script_urls[i]) + '</a></li>';
            }
            html += '</ul></div>';
        }

        tipElement.innerHTML = html;
    }

    // Show error
    function showError(tipElement, message) {
        tipElement.innerHTML = 
            '<div style="display: flex; align-items: center; gap: 8px;">' +
                '<span style="font-size: 18px;">&#128269;</span>' +
                '<strong style="font-size: 16px; color: #667eea;">ClawhubScanner</strong>' +
            '</div>' +
            '<div style="background: rgba(255,0,0,0.1); padding: 12px; border-radius: 8px; margin-top: 12px; color: #ff6b6b;">' +
                '&#10060; ' + escapeHtml(message) +
            '</div>';
    }

    // HTML escape
    function escapeHtml(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Add underline marker to element (no highlight)
    function addUnderline(element, skillName) {
        // Mark as processed
        if (processedElements.has(element)) {
            return;
        }
        processedElements.add(element);
        
        // Add underline marker
        element.style.cssText = 
            'border-bottom: 2px dotted #667eea;' + 
            'cursor: help;' +
            'text-decoration: none;';
        
        // Event handling
        element.addEventListener('mouseenter', function(e) {
            e.stopPropagation();
            showTooltip(this, skillName);
        });
        
        element.addEventListener('mouseleave', function(e) {
            e.stopPropagation();
            delayedHideTooltip();
        });
    }

    // Detect and process clawhub install commands
    function processClawhubCommands() {
        // Use TreeWalker to find all text nodes
        var walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    var parent = node.parentNode;
                    if (!parent) return NodeFilter.FILTER_REJECT;
                    
                    var tagName = parent.tagName.toUpperCase();
                    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'PRE'].includes(tagName)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    
                    // Skip already processed elements
                    if (parent.classList && parent.classList.contains('clawhub-install-detected')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    
                    // Check if contains clawhub install command
                    if (node.textContent && /clawhub\s+install\s+[a-zA-Z0-9_-]+/i.test(node.textContent)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    
                    return NodeFilter.FILTER_REJECT;
                }
            }
        );

        var textNodes = [];
        var node;
        while ((node = walker.nextNode())) {
            textNodes.push(node);
        }

        // Process each text node containing commands
        textNodes.forEach(function(textNode) {
            var parent = textNode.parentNode;
            if (!parent) return;

            var text = textNode.textContent;
            var pattern = /clawhub\s+install\s+([a-zA-Z0-9_-]+)/gi;
            var match;
            var lastIndex = 0;
            var fragment = document.createDocumentFragment();

            while ((match = pattern.exec(text)) !== null) {
                // Add text before match
                if (match.index > lastIndex) {
                    fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
                }

                // Create span element
                var span = document.createElement('span');
                span.className = 'clawhub-install-detected';
                span.dataset.skillName = match[1];
                span.textContent = match[0];
                
                // Add underline marker and events
                addUnderline(span, match[1]);
                
                fragment.appendChild(span);
                lastIndex = pattern.lastIndex;
            }

            // Add remaining text
            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
            }

            // Replace original text node
            parent.replaceChild(fragment, textNode);
        });
    }

    // Listen for DOM changes
    function setupObserver() {
        var timeoutId = null;
        var isProcessing = false;

        var observer = new MutationObserver(function(mutations) {
            // Only trigger when not processing
            if (isProcessing) return;
            
            // Check for new text nodes to process
            var hasNewContent = false;
            for (var i = 0; i < mutations.length; i++) {
                var mutation = mutations[i];
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (var j = 0; j < mutation.addedNodes.length; j++) {
                        var node = mutation.addedNodes[j];
                        // Check if new node contains clawhub install
                        if (node.nodeType === Node.TEXT_NODE) {
                            if (/clawhub\s+install\s+[a-zA-Z0-9_-]+/i.test(node.textContent)) {
                                hasNewContent = true;
                                break;
                            }
                        } else if (node.nodeType === Node.ELEMENT_NODE) {
                            if (/clawhub\s+install\s+[a-zA-Z0-9_-]+/i.test(node.textContent || '')) {
                                hasNewContent = true;
                                break;
                            }
                        }
                    }
                    if (hasNewContent) break;
                }
            }
            
            if (!hasNewContent) return;

            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            
            isProcessing = true;
            timeoutId = setTimeout(function() {
                processClawhubCommands();
                timeoutId = null;
                isProcessing = false;
            }, 500);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Process after page load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(processClawhubCommands, 500);
            });
        } else {
            setTimeout(processClawhubCommands, 500);
        }
    }

    // Initialize
    function init() {
        createTooltip();
        setupObserver();
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
