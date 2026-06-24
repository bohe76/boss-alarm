// src/logger.js

import { EventBus } from './event-bus.js'; // Import EventBus
import { escapeHtml } from './html-utils.js';

let logContainer = null;
const logs = []; // Array to store log entries

export function initLogger(containerElement) {
    logContainer = containerElement;
}

export function log(message, isImportant = false) {
    if (!logContainer) {
        console.error("Logger not initialized. Call initLogger(containerElement) first.");
        return;
    }

    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const formattedTime = `${hours}:${minutes}:${seconds}`;
    const safeMessage = escapeHtml(message);
    const logEntryHTML = `<strong>[${formattedTime}]</strong> ${safeMessage}`;
    
    // Store an object with html and importance flag
    logs.push({ html: logEntryHTML, important: isImportant });

    const entry = document.createElement('div');
    entry.className = 'log-entry';
    
    if (isImportant) {
        entry.classList.add('important');
    }
    
    const timeElement = document.createElement('strong');
    timeElement.textContent = `[${formattedTime}]`;
    entry.append(timeElement, ` ${String(message ?? '')}`);
    
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;

    // Emit event that logs have been updated
    EventBus.emit('log-updated');
}

export function getLogs() {
    return logs;
}
