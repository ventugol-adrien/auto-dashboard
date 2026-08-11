const { contextBridge, ipcRenderer } = require('electron');

let nextWatchId = 0;

contextBridge.exposeInMainWorld('fileStream', {
    watch(filePath, onData, onError) {
        const id = `${Date.now()}-${nextWatchId++}`;
        const handleData = (_event, payload) => {
            if (payload.id === id) onData(payload.content);
        };
        const handleError = (_event, payload) => {
            if (payload.id === id) onError(payload.message);
        };

        ipcRenderer.on('file-stream:data', handleData);
        ipcRenderer.on('file-stream:error', handleError);
        ipcRenderer.send('file-stream:watch', { id, filePath });

        return () => {
            ipcRenderer.send('file-stream:unwatch', id);
            ipcRenderer.removeListener('file-stream:data', handleData);
            ipcRenderer.removeListener('file-stream:error', handleError);
        };
    },
});
