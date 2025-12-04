import { vi } from 'vitest';

// Web Worker Mock
global.Worker = class Worker {
    constructor(stringUrl) {
        this.url = stringUrl;
        this.onmessage = () => {};
    }
    postMessage(msg) {
        // Mock implementation
    }
    terminate() {}
};
