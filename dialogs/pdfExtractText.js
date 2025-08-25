CKEDITOR.dialog.add('pdfExtractTextDialog', function(editor) {
    return {
        title: 'PDF 파일 가져오기',
        minWidth: 500,
        minHeight: 400,
        contents: [{
            id: 'upload',
            label: '파일 업로드',
            elements: [{
                type: 'file',
                id: 'pdfFile',
                label: 'PDF 파일 선택:',
                size: 38,
                accept: '.pdf'
            }, {
                type: 'html',
                html: '<div id="processResult" style="margin-top: 20px; display: none;">' +
                    '<div id="loadingMsg" style="text-align: center; display: none;">' +
                    '<p>파일을 처리 중입니다...</p>' +
                    '<div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 30px; height: 30px; animation: spin 2s linear infinite; margin: 0 auto;"></div>' +
                    '</div>' +
                    '<div id="viewerTabs" style="margin-top: 10px; display: none;">' +
                    '<div style="border-bottom: 1px solid #ccc; padding-bottom: 5px;">' +
                    '<button type="button" id="text-tab" style="padding: 8px 15px; cursor: pointer; border: 1px solid #ccc; border-bottom: none; background-color: #f0f0f0;">텍스트 보기</button>' +
                    '<button type="button" id="json-tab" style="padding: 8px 15px; cursor: pointer; border: 1px solid #ccc; border-bottom: none; background-color: #f0f0f0; margin-left: -1px;">JSON 보기</button>' +
                    '</div>' +
                    '<div id="text-content" style="display: block; padding-top: 10px;">' +
                    '<p><strong>추출된 텍스트:</strong></p>' +
                    '<textarea id="resultText" style="width: 100%; height: 250px; resize: vertical; font-family: monospace;" readonly></textarea>' +
                    '</div>' +
                    '<div id="json-content" style="display: none; padding-top: 10px;">' +
                    '<p><strong>추출된 JSON:</strong></p>' +
                    '<textarea id="resultJson" style="width: 100%; height: 250px; resize: vertical; font-family: monospace;" readonly></textarea>' +
                    '</div>' +
                    '</div>' +
                    '<div style="margin-top: 10px; text-align: right;">' +
                    '<button type="button" id="download-text-btn" style="padding: 8px 15px; cursor: pointer;">텍스트 다운로드</button>' +
                    '<button type="button" id="download-json-btn" style="padding: 8px 15px; cursor: pointer; margin-left: 10px;">JSON 다운로드</button>' +
                    '</div>' +
                    '</div>' +
                    '<style>' +
                    '@keyframes spin {' +
                    '0% { transform: rotate(0deg); }' +
                    '100% { transform: rotate(360deg); }' +
                    '}' +
                    '</style>'
            }]
        }],

        buttons: [{
            id: 'processBtn',
            type: 'button',
            label: '파일 처리',
            onClick: function() {
                const dialog = this.getDialog();
                processPdfFile(dialog, editor);
            }
        }, {
            id: 'insertBtn',
            type: 'button',
            label: '본문 내용 삽입',
            disabled: true,
            onClick: function() {
                const dialog = this.getDialog();
                const isJsonTabActive = document.getElementById('json-content').style.display === 'block';

                let contentToInsert;
                let rawContent;

                if (isJsonTabActive) {
                    rawContent = document.getElementById('resultJson').value;
                    contentToInsert = '<pre style="white-space: pre-wrap; word-wrap: break-word; font-family: monospace; background-color: #f4f4f4; border: 1px solid #ddd; padding: 10px; border-radius: 4px;">' + rawContent + '</pre>';
                } else {
                    rawContent = document.getElementById('resultText').value;
                    contentToInsert = '<div style="white-space: pre-wrap; font-family: monospace;">' + rawContent + '</div>';
                }

                if (rawContent) {
                    editor.insertHtml(contentToInsert);
                    dialog.hide();
                } else {
                    alert('삽입할 내용이 없습니다.');
                }
            }
        },
            CKEDITOR.dialog.cancelButton],

        onShow: function() {
            const dialog = this;
            setTimeout(function() {
                resetDialog(dialog);
            }, 100);
        },

        onLoad: function() {
            const dialog = this;
            const textTab = document.getElementById('text-tab');
            const jsonTab = document.getElementById('json-tab');
            const downloadTextBtn = document.getElementById('download-text-btn');
            const downloadJsonBtn = document.getElementById('download-json-btn');

            if (textTab) {
                textTab.onclick = function() { showTab('text'); };
            }
            if (jsonTab) {
                jsonTab.onclick = function() { showTab('json'); };
            }
            if (downloadTextBtn) {
                downloadTextBtn.onclick = function() {
                    const textContent = document.getElementById('resultText').value;
                    const fileName = dialog.extractedFileName || 'extracted_text.txt';
                    downloadFile(textContent, fileName, 'text/plain');
                };
            }
            if (downloadJsonBtn) {
                downloadJsonBtn.onclick = function() {
                    const jsonContent = document.getElementById('resultJson').value;
                    const fileName = dialog.extractedFileName ? dialog.extractedFileName.replace(/\.pdf$/, '.json') : 'extracted_data.json';
                    downloadFile(jsonContent, fileName, 'application/json');
                };
            }
        }
    };
});

function showTab(tabName) {
    const textContentDiv = document.getElementById('text-content');
    const jsonContentDiv = document.getElementById('json-content');
    const textTabBtn = document.getElementById('text-tab');
    const jsonTabBtn = document.getElementById('json-tab');

    if (tabName === 'text') {
        textContentDiv.style.display = 'block';
        jsonContentDiv.style.display = 'none';
        textTabBtn.style.backgroundColor = '#e0e0e0';
        jsonTabBtn.style.backgroundColor = '#f0f0f0';
    } else if (tabName === 'json') {
        textContentDiv.style.display = 'none';
        jsonContentDiv.style.display = 'block';
        textTabBtn.style.backgroundColor = '#f0f0f0';
        jsonTabBtn.style.backgroundColor = '#e0e0e0';
    }
}

function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function resetDialog(dialog) {
    const processResult = document.getElementById('processResult');
    const resultText = document.getElementById('resultText');
    const resultJson = document.getElementById('resultJson');
    const viewerTabs = document.getElementById('viewerTabs');

    if (processResult) {
        processResult.style.display = 'none';
    }
    if (resultText) {
        resultText.value = '';
    }
    if (resultJson) {
        resultJson.value = '';
    }
    if (viewerTabs) {
        viewerTabs.style.display = 'none';
    }

    try {
        dialog.getButton('insertBtn').disable();
        dialog.getButton('processBtn').enable();
        document.getElementById('download-text-btn').style.display = 'none';
        document.getElementById('download-json-btn').style.display = 'none';
    } catch (e) {
        console.warn('버튼 활성화 실패:', e);
    }
}

const PdfFileProcessor = function (dialog, editor) {
    this.dialog = dialog;
    this.editor = editor;
};

PdfFileProcessor.prototype.processFile = function() {
    const self = this;
    const validation = this.validateInput();

    if (!validation.isValid) return;

    this.showLoading(true);

    this.extractTextFromPdf(validation.file)
        .then(function(result) { // result now contains { textContent, metadata }
            self.handleResult(result.textContent, validation.file, result.metadata);
        })
        .catch(function(error) {
            self.handleError(error);
        })
        .finally(function() {
            self.showLoading(false);
        });
};

PdfFileProcessor.prototype.validateInput = function() {
    const fileInput = this.dialog.getContentElement('upload', 'pdfFile');
    const fileInputElement = fileInput.getInputElement().$;
    const file = fileInputElement.files && fileInputElement.files[0];

    if (!file) {
        alert('파일을 선택해주세요.');
        return { isValid: false };
    }

    const allowedExtensions = ['.pdf'];
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));

    if (allowedExtensions.indexOf(fileExtension) === -1) {
        alert('PDF 파일만 업로드 가능합니다.');
        return { isValid: false };
    }

    if (file.size > 50 * 1024 * 1024) {
        alert('파일 크기는 50MB 이하로 업로드해주세요.');
        return { isValid: false };
    }

    return {
        isValid: true,
        file: file
    };
};

PdfFileProcessor.prototype.extractTextFromPdf = function(file) {
    return new Promise(function(resolve, reject) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const arrayBuffer = e.target.result;
            pdfjsLib.getDocument({ data: arrayBuffer }).promise.then(function(pdf) {
                let textContent = '';
                const numPages = pdf.numPages;
                let pagesProcessed = 0;
                let metadata = {};

                pdf.getMetadata().then(function(data) {
                    metadata = data.info || {};
                    if (data.metadata) {
                        data.metadata.getAll().forEach(function(item) {
                            metadata[item[0]] = item[1];
                        });
                    }
                }).catch(function(error) {
                    console.warn('PDF metadata extraction failed:', error);
                }).finally(function() {
                    if (numPages === 0) {
                        resolve({ textContent: '', metadata: metadata });
                        return;
                    }

                    for (let i = 1; i <= numPages; i++) {
                        pdf.getPage(i).then(function(page) {
                            page.getTextContent().then(function(textContentOnPage) {
                                textContentOnPage.items.forEach(function(item) {
                                    textContent += item.str + ' ';
                                });
                                pagesProcessed++;
                                if (pagesProcessed === numPages) {
                                    resolve({ textContent: textContent, metadata: metadata });
                                }
                            }).catch(function(error) {
                                reject(new Error('페이지 텍스트 추출 오류: ' + error.message));
                            });
                        }).catch(function(error) {
                            reject(new Error('페이지 로드 오류: ' + error.message));
                        });
                    }
                });
            }).catch(function(error) {
                reject(new Error('PDF 로드 오류: ' + error.message));
            });
        };
        reader.onerror = function() {
            reject(new Error('파일 읽기 오류'));
        };
        reader.readAsArrayBuffer(file);
    });
};

PdfFileProcessor.prototype.handleResult = function(text, file, pdfMetadata) {
    const self = this;

    // Part 1: Immediately display client-side results for local testing
    console.log("Displaying client-side results for local testing.");
    try {
        const creationDate = getFormattedSeoulDate(pdfMetadata.CreationDate, file.lastModified);
        const uploadDate = getCurrentSeoulDate();
        const encodedTextForJson = btoa(unescape(encodeURIComponent(text)));
        const customJson = {
            fileName: file.name,
            fileSize: file.size,
            creationDate: creationDate,
            uploadDate: uploadDate,
            metadata: pdfMetadata,
            content: encodedTextForJson
        };

        const resultText = document.getElementById('resultText');
        const resultJson = document.getElementById('resultJson');
        const viewerTabs = document.getElementById('viewerTabs');

        if (resultText && resultJson && viewerTabs) {
            resultText.value = text;
            resultJson.value = JSON.stringify(customJson, null, 2);
            viewerTabs.style.display = 'block';
            showTab('text');
        }

        self.dialog.getButton('insertBtn').enable();
        document.getElementById('download-text-btn').style.display = 'inline-block';
        document.getElementById('download-json-btn').style.display = 'inline-block';
        self.dialog.extractedFileName = file.name;
    } catch (e) {
        console.error("Failed to display client-side results: " + e.message);
    }

    // Part 2: Proceed with fetching data from the server
    console.log("Attempting to send data to the server...");
    const encodedTextForServer = btoa(unescape(encodeURIComponent(text)));
    const params = 'fileName=' + encodeURIComponent(file.name) +
        '&fileSize=' + file.size +
        '&fileType=' + encodeURIComponent(file.type) +
        '&hwpData=' + encodeURIComponent(encodedTextForServer) + // Mimic hwpimporter parameter
        '&pdfMetadata=' + encodeURIComponent(JSON.stringify(pdfMetadata));

    fetch('/index.do?menuUid=ff80808198a2b61b0198c7d58c3c02e3', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: params
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Server responded with status: ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        console.log("Successfully received data from server:", data);
        // Optionally, you could update the dialog with server data here if needed
    })
    .catch((error) => {
        // This will catch both fetch errors (like network issues) and server errors.
        // We don't alert the user because the client-side data is already displayed.
        console.warn("Server fetch failed (this is expected on file://):", error.message);
    });
};

PdfFileProcessor.prototype.handleError = function(error) {
    console.error('PDF 파일 처리 오류:', error);
    alert('파일 처리 중 오류가 발생했습니다: ' + error.message);
    try {
        this.dialog.getButton('processBtn').enable();
        document.getElementById('download-text-btn').style.display = 'none';
        document.getElementById('download-json-btn').style.display = 'none';
    } catch (e) {
        console.warn('버튼 활성화 실패:', e);
    }
};

PdfFileProcessor.prototype.showLoading = function(show) {
    const processResult = document.getElementById('processResult');
    const loadingMsg = document.getElementById('loadingMsg');
    const viewerTabs = document.getElementById('viewerTabs');

    if (processResult) processResult.style.display = show ? 'block' : processResult.style.display;
    if (loadingMsg) loadingMsg.style.display = show ? 'block' : 'none';
    if (viewerTabs) viewerTabs.style.display = show ? 'none' : 'block';

    try {
        if (show) {
            this.dialog.getButton('processBtn').disable();
            document.getElementById('download-text-btn').style.display = 'none';
            document.getElementById('download-json-btn').style.display = 'none';
        } else {
            this.dialog.getButton('processBtn').enable();
        }
    } catch (e) {
        console.warn('버튼 활성화 실패:', e);
    }
};

function processPdfFile(dialog, editor) {
    const processor = new PdfFileProcessor(dialog, editor);
    processor.processFile();
}

function getFormattedSeoulDate(pdfDate, fallbackTimestamp) {
    let date;
    // PDF dates are strings like "D:20240101120000Z"
    if (pdfDate && typeof pdfDate === 'string' && pdfDate.startsWith('D:')) {
        try {
            const dateStr = pdfDate.substring(2, 16);
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            // Basic parsing, might not be perfect for all timezones in PDF date
            date = new Date(`${year}-${month}-${day}`);
        } catch (e) {
            date = new Date(fallbackTimestamp);
        }
    } else {
        date = new Date(fallbackTimestamp);
    }

    if (isNaN(date.getTime())) { // Check if date is valid
        return 'Invalid Date';
    }

    // Use Intl.DateTimeFormat to get yyyy-mm-dd in Seoul time
    try {
        const formatter = new Intl.DateTimeFormat('en-CA', { // 'en-CA' gives yyyy-mm-dd format
            timeZone: 'Asia/Seoul',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        return formatter.format(date);
    } catch (e) {
        // Fallback for environments that might not support Intl or the timezone
        const offset = 9 * 60 * 60 * 1000; // Seoul is UTC+9
        const seoulDate = new Date(date.getTime() + offset);
        const year = seoulDate.getUTCFullYear();
        const month = ('0' + (seoulDate.getUTCMonth() + 1)).slice(-2);
        const day = ('0' + seoulDate.getUTCDate()).slice(-2);
        return `${year}-${month}-${day}`;
    }
}

function getCurrentSeoulDate() {
    try {
        const formatter = new Intl.DateTimeFormat('en-CA', { // 'en-CA' gives yyyy-mm-dd format
            timeZone: 'Asia/Seoul',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        return formatter.format(new Date());
    } catch (e) {
        const date = new Date();
        const offset = 9 * 60 * 60 * 1000; // Seoul is UTC+9
        const seoulDate = new Date(date.getTime() + offset);
        const year = seoulDate.getUTCFullYear();
        const month = ('0' + (seoulDate.getUTCMonth() + 1)).slice(-2);
        const day = ('0' + seoulDate.getUTCDate()).slice(-2);
        return `${year}-${month}-${day}`;
    }
}