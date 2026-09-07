(function() {
    'use strict';

    // ---------- 配置 ----------
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
    const STORAGE_KEY = 'huchuan_files';      // localStorage 键名

    // ---------- DOM 引用 ----------
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const removeFileBtn = document.getElementById('removeFile');
    const shareCode = document.getElementById('shareCode');
    const shareLink = document.getElementById('shareLink');
    const copyCodeBtn = document.getElementById('copyCode');
    const copyLinkBtn = document.getElementById('copyLink');
    const uploadNewBtn = document.getElementById('uploadNew');

    const sendPanel = document.getElementById('sendPanel');
    const receivePanel = document.getElementById('receivePanel');
    const tabBtns = document.querySelectorAll('.tab-btn');

    const receiveInput = document.getElementById('receiveInput');
    const fetchBtn = document.getElementById('fetchBtn');
    const receiveResult = document.getElementById('receiveResult');
    const receiveFileName = document.getElementById('receiveFileName');
    const receiveFileSize = document.getElementById('receiveFileSize');
    const downloadBtn = document.getElementById('downloadBtn');
    const receiveError = document.getElementById('receiveError');
    const errorMsg = document.getElementById('errorMsg');

    // ---------- 状态 ----------
    let currentFile = null;        // 存储 File 对象
    let currentShareCode = '';    // 6位分享码

    // ---------- 工具函数 ----------
    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    // 生成随机6位分享码（字母+数字）
    function generateShareCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // 保存到 localStorage
    function saveFileToStorage(file, code) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const data = e.target.result; // base64
                const record = {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    data: data,
                    code: code,
                    timestamp: Date.now()
                };
                // 获取已有记录
                let files = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
                // 删除同code旧记录（避免冲突）
                delete files[code];
                files[code] = record;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
                resolve();
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // 根据分享码获取文件记录
    function getFileByCode(code) {
        const files = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        return files[code] || null;
    }

    // 删除存储中的记录（可选）
    function deleteFileByCode(code) {
        const files = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (files[code]) {
            delete files[code];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
        }
    }

    // 生成完整链接（当前页面URL + 参数）
    function generateShareLink(code) {
        const url = new URL(window.location.href);
        url.searchParams.set('code', code);
        return url.toString();
    }

    // 从URL参数获取code
    function getCodeFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('code') || '';
    }

    // ---------- 渲染文件信息 (发送端) ----------
    function displayFileInfo(file) {
        fileName.textContent = file.name;
        fileSize.textContent = formatSize(file.size);
        fileInfo.style.display = 'block';
        dropZone.style.display = 'none';
    }

    // 重置发送面板 (清空状态)
    function resetSendPanel() {
        currentFile = null;
        currentShareCode = '';
        fileInfo.style.display = 'none';
        dropZone.style.display = 'block';
        shareCode.textContent = '------';
        shareLink.value = '';
        fileInput.value = '';
        // 移除可能存在的旧记录（但保留存储，用户可手动清理）
    }

    // 处理文件上传
    async function handleFile(file) {
        if (!file) return;
        if (file.size > MAX_FILE_SIZE) {
            alert('文件大小超过 100 MB 限制，请选择更小的文件。');
            return;
        }

        // 生成分享码 (确保唯一)
        let code = generateShareCode();
        // 如果该码已存在，重新生成（极小概率）
        while (getFileByCode(code)) {
            code = generateShareCode();
        }

        currentFile = file;
        currentShareCode = code;

        try {
            await saveFileToStorage(file, code);
            // 显示文件信息
            displayFileInfo(file);
            shareCode.textContent = code;
            const link = generateShareLink(code);
            shareLink.value = link;
        } catch (err) {
            alert('文件保存失败，请重试。');
            console.error(err);
        }
    }

    // ---------- 事件绑定 ----------

    // 1. 点击上传 (通过dropZone的input)
    fileInput.addEventListener('change', function(e) {
        if (this.files && this.files.length > 0) {
            handleFile(this.files[0]);
        }
        // 清空input以便重复选择同一文件
        this.value = '';
    });

    // 2. 拖拽上传
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
    });
    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFile(files[0]);
        }
    });

    // 3. 移除文件（不清除存储，但清空界面状态，存储留待垃圾回收）
    removeFileBtn.addEventListener('click', function() {
        if (currentShareCode) {
            // 可选：删除存储记录，但为了安全我们保留，用户可再次上传覆盖
            // 我们只清界面，并删除存储中的记录（避免占用）
            if (confirm('移除文件后，分享链接将失效。确定移除吗？')) {
                deleteFileByCode(currentShareCode);
                resetSendPanel();
            }
        } else {
            resetSendPanel();
        }
    });

    // 4. 上传新文件
    uploadNewBtn.addEventListener('click', function() {
        resetSendPanel();
        // 触发文件选择
        fileInput.click();
    });

    // 5. 复制分享码
    copyCodeBtn.addEventListener('click', function() {
        const text = shareCode.textContent;
        if (text && text !== '------') {
            navigator.clipboard.writeText(text).then(() => {
                alert('分享码已复制！');
            }).catch(() => {
                // fallback
                const range = document.createRange();
                const sel = window.getSelection();
                const span = document.createElement('span');
                span.textContent = text;
                document.body.appendChild(span);
                range.selectNode(span);
                sel.removeAllRanges();
                sel.addRange(range);
                document.execCommand('copy');
                document.body.removeChild(span);
                alert('分享码已复制！');
            });
        }
    });

    // 6. 复制链接
    copyLinkBtn.addEventListener('click', function() {
        const link = shareLink.value;
        if (link) {
            navigator.clipboard.writeText(link).then(() => {
                alert('链接已复制！');
            }).catch(() => {
                // fallback
                shareLink.select();
                document.execCommand('copy');
                alert('链接已复制！');
            });
        }
    });

    // ---------- 选项卡切换 ----------
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const tab = this.dataset.tab;
            if (tab === 'send') {
                sendPanel.style.display = 'block';
                receivePanel.style.display = 'none';
            } else {
                sendPanel.style.display = 'none';
                receivePanel.style.display = 'block';
                // 如果URL有code，自动填入
                const codeFromUrl = getCodeFromURL();
                if (codeFromUrl) {
                    receiveInput.value = codeFromUrl;
                    // 自动获取
                    fetchFileByCode(codeFromUrl);
                }
            }
        });
    });

    // ---------- 接收功能 ----------
    async function fetchFileByCode(code) {
        if (!code) {
            receiveResult.style.display = 'none';
            receiveError.style.display = 'none';
            return;
        }
        const record = getFileByCode(code);
        if (!record) {
            receiveResult.style.display = 'none';
            receiveError.style.display = 'flex';
            errorMsg.textContent = '未找到该分享码对应的文件，可能已过期或被移除。';
            return;
        }
        // 显示文件信息
        receiveFileName.textContent = record.name;
        receiveFileSize.textContent = formatSize(record.size);
        receiveResult.style.display = 'block';
        receiveError.style.display = 'none';
        // 保存记录到下载按钮
        downloadBtn.dataset.code = code;
    }

    fetchBtn.addEventListener('click', function() {
        const code = receiveInput.value.trim().toUpperCase();
        if (code.length !== 6) {
            alert('请输入6位分享码');
            return;
        }
        fetchFileByCode(code);
    });

    // 回车触发获取
    receiveInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            fetchBtn.click();
        }
    });

    // 下载文件
    downloadBtn.addEventListener('click', function() {
        const code = this.dataset.code;
        if (!code) return;
        const record = getFileByCode(code);
        if (!record) {
            alert('文件已不存在，请重新获取。');
            return;
        }
        // 从base64还原
        const link = document.createElement('a');
        link.href = record.data;
        link.download = record.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // ---------- 初始化：检测URL参数 ----------
    (function init() {
        const code = getCodeFromURL();
        if (code) {
            // 自动切换到接收面板
            document.querySelector('.tab-btn[data-tab="receive"]').click();
            receiveInput.value = code;
            fetchFileByCode(code);
        }
        // 显示默认发送面板
        // 但有可能已经切换到接收，所以无需额外操作
    })();

})();