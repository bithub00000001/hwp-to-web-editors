CKEDITOR.dialog.add('hwpimportDialog', function(editor) {
    return {
        title: 'HWP/HWPX 파일 가져오기',
        minWidth: 500,
        minHeight: 400,
        contents: [{
            id: 'upload',
            label: '파일 업로드 및 옵션',
            elements: [{
                type: 'file',
                id: 'hwpFile',
                label: 'HWP/HWPX 파일 선택:',
                size: 38,
                accept: '.hwp,.hwpx'
            }, {
                type: 'html',
                html: '<div style="margin: 20px 0;">' +
                    '<p><strong>처리 방식 선택:</strong></p>' +
                    '<div>' +
                    '<input type="radio" id="processOriginal" name="processType" value="original" checked>' +
                    '<label for="processOriginal" style="margin-left: 5px;">원본 서식 그대로 삽입</label>' +
                    '</div>' +
                    '<div style="margin-top: 10px;">' +
                    '<input type="radio" id="processSummary" name="processType" value="summary">' +
                    '<label for="processSummary" style="margin-left: 5px;">요약하여 삽입</label>' +
                    '</div>' +
                    '</div>'
            }, {
                type: 'html',
                html: '<div id="processResult" style="margin-top: 20px; display: none;">' +
                    '<div id="loadingMsg" style="text-align: center; display: none;">' +
                    '<p>파일을 처리 중입니다...</p>' +
                    '<div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 30px; height: 30px; animation: spin 2s linear infinite; margin: 0 auto;"></div>' +
                    '</div>' +
                    '<div id="resultContent" style="display: none;">' +
                    '<p><strong>처리 결과:</strong></p>' +
                    '<textarea id="resultText" style="width: 100%; height: 150px; resize: vertical;" readonly></textarea>' +
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
                // this.getDialog()로 다이얼로그 객체 가져오기
                const dialog = this.getDialog();
                processHwpFile(dialog, editor);
            }
        }, {
            id: 'insertBtn',
            type: 'button',
            label: '에디터에 삽입',
            disabled: true,
            onClick: function() {
                const dialog = this.getDialog();
                const resultText = document.getElementById('resultText').value;
                if (resultText) {
                    editor.insertHtml(resultText);
                    dialog.hide();
                } else {
                    alert('삽입할 내용이 없습니다.');
                }
            }
        },
            CKEDITOR.dialog.cancelButton],

        onShow: function() {
            // 대화상자가 열릴 때 초기화
            const dialog = this;
            setTimeout(function() {
                resetDialog(dialog);
            }, 100);
        }
    };
});

// 대화상자 초기화 함수
function resetDialog(dialog) {
    const processResult = document.getElementById('processResult');
    const resultText = document.getElementById('resultText');

    if (processResult) {
        processResult.style.display = 'none';
    }
    if (resultText) {
        resultText.value = '';
    }

    try {
        dialog.getButton('insertBtn').disable();
        dialog.getButton('processBtn').enable();
    } catch (e) {
        console.warn('버튼 상태 변경 실패:', e);
    }
}

// HWP 파일 처리 클래스
const HwpFileProcessor = function (dialog, editor) {
    this.dialog = dialog;
    this.editor = editor;
};

HwpFileProcessor.prototype.processFile = function() {
    const self = this;
    const validation = this.validateInput();

    if (!validation.isValid) return;

    this.showLoading(true);

    // Base64로 변환해서 전송
    this.convertToBase64AndUpload(validation.file, validation.processType)
        .then(function(result) {
            self.handleResult(result);
        })
        .catch(function(error) {
            self.handleError(error);
        })
        .finally(function() {
            self.showLoading(false);
        });
};

HwpFileProcessor.prototype.validateInput = function() {
    const fileInput = this.dialog.getContentElement('upload', 'hwpFile');
    const fileInputElement = fileInput.getInputElement().$;
    const file = fileInputElement.files && fileInputElement.files[0];

    if (!file) {
        alert('파일을 선택해주세요.');
        return { isValid: false };
    }

    const allowedExtensions = ['.hwp', '.hwpx'];
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));

    if (allowedExtensions.indexOf(fileExtension) === -1) {
        alert('HWP 또는 HWPX 파일만 업로드 가능합니다.');
        return { isValid: false };
    }

    // 파일 크기 체크 (50MB)
    if (file.size > 50 * 1024 * 1024) {
        alert('파일 크기는 50MB 이하로 업로드해주세요.');
        return { isValid: false };
    }

    const processTypeElement = document.querySelector('input[name="processType"]:checked');
    const processType = processTypeElement ? processTypeElement.value : 'original';

    return {
        isValid: true,
        file: file,
        processType: processType
    };
};

// Base64 변환 및 업로드
HwpFileProcessor.prototype.convertToBase64AndUpload = function(file, processType) {
    const self = this;

    return new Promise(function(resolve, reject) {
        const reader = new FileReader();

        reader.onload = function(e) {
            const base64Data = e.target.result.split(',')[1];

            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/index.do?menuUid=ff80808198a2b61b0198c7d58c3c02e3', true);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

            // Base64 데이터와 파라미터들
            const params = 'hwpData=' + encodeURIComponent(base64Data) +
                '&fileName=' + encodeURIComponent(file.name) +
                '&fileType=' + encodeURIComponent(file.type) +
                '&fileSize=' + file.size +
                '&processType=' + encodeURIComponent(processType);

            xhr.onload = function() {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        reject(new Error('서버 응답 파싱 오류'));
                    }
                } else {
                    reject(new Error('서버 오류: ' + xhr.status));
                }
            };

            xhr.onerror = function() {
                reject(new Error('네트워크 오류'));
            };

            xhr.ontimeout = function() {
                reject(new Error('요청 시간 초과'));
            };

            xhr.timeout = 60000; // 60초 타임아웃 (HWP 처리시간 고려)
            xhr.send(params);
        };

        reader.onerror = function() {
            reject(new Error('파일 읽기 오류'));
        };

        reader.readAsDataURL(file);
    });
};

HwpFileProcessor.prototype.handleResult = function(data) {
    if (data.status === 'success') {
        this.displayResult(data.content);
        this.dialog.getButton('insertBtn').enable();
    } else {
        throw new Error(data.message || '파일 처리 중 오류가 발생했습니다.');
    }
};

HwpFileProcessor.prototype.handleError = function(error) {
    console.error('HWP 파일 처리 오류:', error);
    alert('파일 처리 중 오류가 발생했습니다: ' + error.message);
    try {
        this.dialog.getButton('processBtn').enable();
    } catch (e) {
        console.warn('버튼 활성화 실패:', e);
    }
};

HwpFileProcessor.prototype.displayResult = function(content) {
    const resultText = document.getElementById('resultText');
    const resultContent = document.getElementById('resultContent');

    if (resultText && resultContent) {
        resultText.value = content;
        resultContent.style.display = 'block';
    }
};

HwpFileProcessor.prototype.showLoading = function(show) {
    const processResult = document.getElementById('processResult');
    const loadingMsg = document.getElementById('loadingMsg');
    const resultContent = document.getElementById('resultContent');

    if (processResult) processResult.style.display = show ? 'block' : processResult.style.display;
    if (loadingMsg) loadingMsg.style.display = show ? 'block' : 'none';
    if (resultContent) resultContent.style.display = show ? 'none' : resultContent.style.display;

    try {
        if (show) {
            this.dialog.getButton('processBtn').disable();
        } else {
            this.dialog.getButton('processBtn').enable();
        }
    } catch (e) {
        console.warn('버튼 상태 변경 실패:', e);
    }
};

function processHwpFile(dialog, editor) {
    const processor = new HwpFileProcessor(dialog, editor);
    processor.processFile();
}
