const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');

// 配置 electron-store
const store = new Store({
    encodeValues: true, // 确保正确编码存储的值
    clearInvalidConfig: true // 清除无效的配置
});

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');
    mainWindow.webContents.openDevTools(); // 开启调试工具以便查看问题
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// IPC通信处理
ipcMain.on('save-options', (event, options) => {
    try {
        console.log('Saving options:', options);
        store.set('lottery-options', options);
        event.reply('save-options-reply', 'success');
    } catch (error) {
        console.error('Error saving options:', error);
        event.reply('save-options-reply', 'error');
    }
});

ipcMain.on('get-options', (event) => {
    try {
        const options = store.get('lottery-options', {});
        console.log('Getting options:', options);
        event.reply('get-options-reply', options);
    } catch (error) {
        console.error('Error getting options:', error);
        event.reply('get-options-reply', {});
    }
}); 