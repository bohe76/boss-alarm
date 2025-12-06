// Web Worker Mock
global.Worker = class Worker {
    constructor(stringUrl) {
        this.url = stringUrl;
        this.onmessage = () => {};
    }
    postMessage() {
        // Mock implementation
    }
    terminate() {}
};
