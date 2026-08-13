const { app, BrowserWindow, ipcMain } = require('electron');
const { readFile, watch } = require('node:fs');
const path = require('node:path');

const fileWatchers = new Map();
let mainWindow;

const getArgument = (name) => {
    const index = process.argv.indexOf(`--${name}`);
    return index === -1 ? undefined : process.argv[index + 1];
};

const getDashboardConfig = () => {
    try {
        return JSON.parse(process.env.AUTO_DASHBOARD_CONFIG ?? 'null');
    } catch {
        return null;
    }
};

const closeFileWatcher = (key) => {
    fileWatchers.get(key)?.close();
    fileWatchers.delete(key);
};

ipcMain.on('file-stream:watch', (event, { id, filePath }) => {
    const key = `${event.sender.id}:${id}`;
    const resolvedPath = path.resolve(filePath);
    closeFileWatcher(key);

    const publish = () => {
        readFile(resolvedPath, 'utf8', (error, content) => {
            if (event.sender.isDestroyed()) return;

            if (error) {
                event.sender.send('file-stream:error', {
                    id,
                    message: error.message,
                });
                return;
            }

            event.sender.send('file-stream:data', { id, content });
        });
    };

    try {
        const watcher = watch(resolvedPath, publish);
        fileWatchers.set(key, watcher);
        publish();
    } catch (error) {
        event.sender.send('file-stream:error', {
            id,
            message: error instanceof Error ? error.message : String(error),
        });
    }
});

ipcMain.on('file-stream:unwatch', (event, id) => {
    closeFileWatcher(`${event.sender.id}:${id}`);
});

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.cjs'),
        },
    });
    const dashboardConfig = getDashboardConfig();
    const filePath = dashboardConfig?.path ?? getArgument('path');
    const cards = dashboardConfig?.cards ?? [];
    const query = {};

    if (cards.length > 0 && filePath) {
        query.cards = JSON.stringify(cards);
        query.path = filePath;
    }

    if (process.env.AUTO_DASHBOARD_RENDERER === 'production') {
        mainWindow.loadFile(
            path.join(__dirname, '..', 'dist', 'index.html'),
            { query },
        );
    } else {
        const launchUrl = new URL(
            process.env.VITE_DEV_SERVER_URL ??
            getArgument('dev-server-url') ??
            'http://127.0.0.1:5173',
        );

        for (const [key, value] of Object.entries(query)) {
            launchUrl.searchParams.set(key, value);
        }

        mainWindow.loadURL(launchUrl.toString());
    }
    mainWindow.once('closed', () => {
        mainWindow = undefined;
    });
};

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    for (const key of fileWatchers.keys()) closeFileWatcher(key);
    if (process.platform !== 'darwin') app.quit();
});
