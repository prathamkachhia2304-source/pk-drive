// ========== MyCloud Drive - Main Application ==========
let filesArray = [];
let currentView = 'grid';
let searchQuery = '';

const fileContainer = document.getElementById('fileContainer');
const fileInput = document.getElementById('fileInput');
const searchInput = document.getElementById('searchInput');
const storageStatsDiv = document.getElementById('storageStats');
const clearAllBtn = document.getElementById('clearAllBtn');
const exportBackupBtn = document.getElementById('exportBackupBtn');
const importBackupBtn = document.getElementById('importBackupBtn');
const importFileInput = document.getElementById('importFileInput');
const gridViewBtn = document.getElementById('gridViewBtn');
const listViewBtn = document.getElementById('listViewBtn');
const toastMsgDiv = document.getElementById('toastMsg');

function showToast(message, duration = 2200) {
    toastMsgDiv.textContent = message;
    toastMsgDiv.style.opacity = '1';
    toastMsgDiv.style.visibility = 'visible';
    setTimeout(() => {
        toastMsgDiv.style.opacity = '0';
        toastMsgDiv.style.visibility = 'hidden';
    }, duration);
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function updateStats() {
    const totalBytes = filesArray.reduce((sum, file) => sum + (file.size || 0), 0);
    const totalFormatted = formatBytes(totalBytes);
    const fileCount = filesArray.length;
    storageStatsDiv.innerHTML = `💾 ${totalFormatted} used · ${fileCount} file${fileCount !== 1 ? 's' : ''}`;
}

function saveToLocalStorage() {
    try {
        const toStore = filesArray.map(f => ({
            id: f.id,
            name: f.name,
            type: f.type,
            size: f.size,
            dataURL: f.dataURL,
            dateAdded: f.dateAdded
        }));
        localStorage.setItem('mycloud_drive_files', JSON.stringify(toStore));
        console.log("✅ Files saved to localStorage:", filesArray.length);
        return true;
    } catch(e) {
        console.error("Storage error:", e);
        showToast("⚠️ Storage full! Delete some files first.");
        return false;
    }
}

function loadFromLocalStorage() {
    const raw = localStorage.getItem('mycloud_drive_files');
    console.log("Loading from storage:", raw ? "found data" : "no data");
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                filesArray = parsed;
                showToast(`📁 Loaded ${filesArray.length} saved files`);
                console.log("Loaded files:", filesArray.length);
            } else {
                filesArray = [];
            }
        } catch(e) {
            console.error("Parse error:", e);
            filesArray = [];
        }
    } else {
        filesArray = [];
    }
    renderCurrentView();
    updateStats();
}

function addFiles(fileList) {
    if (!fileList || fileList.length === 0) return;
    
    const newFilesPromises = [];
    for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const promise = new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const newFileObj = {
                    id: Date.now() + '-' + Math.random().toString(36).substring(2) + '-' + i,
                    name: file.name,
                    type: file.type || 'application/octet-stream',
                    size: file.size,
                    dataURL: e.target.result,
                    dateAdded: new Date().toISOString()
                };
                resolve(newFileObj);
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        });
        newFilesPromises.push(promise);
    }
    
    Promise.all(newFilesPromises).then((loadedFiles) => {
        const validFiles = loadedFiles.filter(f => f !== null);
        if (validFiles.length) {
            filesArray.push(...validFiles);
            saveToLocalStorage();
            renderCurrentView();
            updateStats();
            showToast(`✅ ${validFiles.length} file(s) uploaded & saved permanently`);
        }
    });
}

function deleteFileById(fileId) {
    const fileToDelete = filesArray.find(f => f.id === fileId);
    if (!fileToDelete) return;
    filesArray = filesArray.filter(f => f.id !== fileId);
    saveToLocalStorage();
    renderCurrentView();
    updateStats();
    showToast(`🗑️ Removed "${fileToDelete.name}"`);
}

function clearAllFiles() {
    if (filesArray.length === 0) {
        showToast("No files to clear");
        return;
    }
    if (confirm("⚠️ Delete ALL documents? This action is permanent.")) {
        filesArray = [];
        saveToLocalStorage();
        renderCurrentView();
        updateStats();
        showToast("🗑️ All files deleted");
    }
}

function downloadFile(fileObj) {
    const link = document.createElement('a');
    link.href = fileObj.dataURL;
    link.download = fileObj.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`⬇️ Downloading ${fileObj.name}`);
}

function exportBackup() {
    if (filesArray.length === 0) {
        showToast("No files to backup");
        return;
    }
    const backupData = filesArray.map(f => ({
        id: f.id,
        name: f.name,
        type: f.type,
        size: f.size,
        dataURL: f.dataURL,
        dateAdded: f.dateAdded
    }));
    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mycloud_backup_${new Date().toISOString().slice(0,19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("💾 Backup exported");
}

function importBackup(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData)) {
                if (confirm(`⚠️ This will REPLACE current files with ${importedData.length} file(s). Continue?`)) {
                    filesArray = importedData.map(item => ({
                        id: item.id || Date.now() + '-' + Math.random(),
                        name: item.name,
                        type: item.type || 'application/octet-stream',
                        size: item.size || 0,
                        dataURL: item.dataURL,
                        dateAdded: item.dateAdded || new Date().toISOString()
                    }));
                    saveToLocalStorage();
                    renderCurrentView();
                    updateStats();
                    showToast(`📀 Restored ${filesArray.length} files`);
                }
            } else {
                showToast("❌ Invalid backup file");
            }
        } catch(err) {
            showToast("❌ Failed to parse backup");
        }
    };
    reader.readAsText(file);
}

function getFilteredFiles() {
    if (!searchQuery.trim()) return [...filesArray];
    const lowerQuery = searchQuery.toLowerCase();
    return filesArray.filter(file => file.name.toLowerCase().includes(lowerQuery));
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'pdf') return '📑';
    if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return '🖼️';
    if (ext === 'mp4' || ext === 'webm') return '🎬';
    if (ext === 'mp3' || ext === 'wav') return '🎵';
    if (ext === 'doc' || ext === 'docx') return '📘';
    if (ext === 'xls' || ext === 'xlsx') return '📊';
    if (ext === 'txt') return '📄';
    return '📎';
}

function renderCurrentView() {
    const filtered = getFilteredFiles();
    if (filtered.length === 0) {
        fileContainer.innerHTML = `<div class="empty-state">📭 No documents found. Upload files to get started! ✨<br><small style="display:block;margin-top:10px;">💡 Files are saved automatically in your browser</small></div>`;
        return;
    }
    if (currentView === 'grid') {
        fileContainer.className = 'file-grid';
        fileContainer.innerHTML = '';
        for (const file of filtered) {
            const card = document.createElement('div');
            card.className = 'file-card';
            const icon = getFileIcon(file.name);
            card.innerHTML = `
                <div class="file-icon">${icon}</div>
                <div class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(truncate(file.name, 28))}</div>
                <div class="file-meta">
                    <span>${formatBytes(file.size || 0)}</span>
                    <button class="delete-file" data-id="${file.id}" title="Delete">🗑️</button>
                </div>
            `;
            card.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-file')) return;
                downloadFile(file);
            });
            card.querySelector('.delete-file').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteFileById(file.id);
            });
            fileContainer.appendChild(card);
        }
    } else {
        fileContainer.className = 'file-list';
        fileContainer.innerHTML = '';
        for (const file of filtered) {
            const row = document.createElement('div');
            row.className = 'list-row';
            const icon = getFileIcon(file.name);
            row.innerHTML = `
                <div class="list-left">
                    <div class="list-icon">${icon}</div>
                    <div class="list-info">
                        <div class="list-name">${escapeHtml(file.name)}</div>
                        <div class="list-size">${formatBytes(file.size || 0)} · ${new Date(file.dateAdded).toLocaleDateString()}</div>
                    </div>
                </div>
                <div class="list-actions">
                    <button class="icon-btn download-list-btn" data-id="${file.id}">⬇️ Download</button>
                    <button class="icon-btn danger delete-list-btn" data-id="${file.id}">🗑️ Delete</button>
                </div>
            `;
            row.querySelector('.download-list-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                downloadFile(file);
            });
            row.querySelector('.delete-list-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteFileById(file.id);
            });
            fileContainer.appendChild(row);
        }
    }
}

function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function truncate(str, len) {
    if (str.length <= len) return str;
    return str.slice(0, len-2) + '..';
}

// ========== Event Listeners ==========
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        addFiles(e.target.files);
        fileInput.value = '';
    }
});

document.getElementById('uploadBtnTrigger').addEventListener('click', () => {
    fileInput.click();
});

searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderCurrentView();
});

clearAllBtn.addEventListener('click', clearAllFiles);
exportBackupBtn.addEventListener('click', exportBackup);
importBackupBtn.addEventListener('click', () => importFileInput.click());
importFileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        importBackup(e.target.files[0]);
        importFileInput.value = '';
    }
});

gridViewBtn.addEventListener('click', () => {
    currentView = 'grid';
    gridViewBtn.classList.add('active');
    listViewBtn.classList.remove('active');
    renderCurrentView();
});

listViewBtn.addEventListener('click', () => {
    currentView = 'list';
    listViewBtn.classList.add('active');
    gridViewBtn.classList.remove('active');
    renderCurrentView();
});

// ========== Initial Load ==========
loadFromLocalStorage();