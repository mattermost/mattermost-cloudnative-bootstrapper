const { app, BrowserWindow, nativeImage } = require('electron');
const path = require('path');
const { execFile, exec } = require('child_process');
const { error } = require('console');
const fs = require('fs');

const isDevelopment = process.env.NODE_ENV === 'development';

function createWindow() {
    const iconPath = path.join(__dirname, 'assets', 'appIcon.icns'); // Adjust the path as needed
    const appIcon = nativeImage.createFromPath(iconPath);
    const win = new BrowserWindow({
        icon: appIcon,
        autoHideMenuBar: true,
        center: true,
        minHeight: 1000,
        minWidth: 1500,
        title: 'Mattermost Bootstrapper Utility',
    });
    if (isDevelopment) {
        win.loadURL('http://localhost:3000'); // Assuming React dev server
    } else {
        const indexPath = path.join(app.getAppPath(), 'webapp', 'build', 'index.html');
        console.log(indexPath);
        win.loadFile(indexPath); 
    }
}

app.whenReady().then(() => {
    createWindow();
    if (isDevelopment) {
        exec('/Users/nickmisasi/go/bin/cdash server')
    } else {
        execFile(path.join(__dirname, 'build', 'mmbs-mac_arm64'), (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`Error: ${stderr}`);
                return;
            }
            console.log(`stdout: ${stdout}`);
        });
    }
});