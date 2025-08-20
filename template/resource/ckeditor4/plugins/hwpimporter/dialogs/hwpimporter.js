CKEDITOR.dialog.add('hwpimportDialog', (editor) => {
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
                html: `
                    <div style="margin: 20px 0;">
                        <p><strong>처리 방식 선택:</strong></p>
                        <div>
                            <input type="radio" id="processOriginal" name="processType" value="original" checked>
                            <label for="processOriginal" style="margin-left: 5px;">원본 서식 그대로 삽입</label>
                        </div>
                        <div style="margin-top: 10px;">
                            <input type="radio" id="processSummary" name="processType" value="summary">
                            <label for="processSummary" style="margin-left: 5px;">요약하여 삽입</label>
                        </div>
                    </div>
                `
            }, {
                type: 'html',
                html: `
                    <div id="processResult" style="margin-top: 20px; display: none;">
                        <div id="loadingMsg" style="text-align: center; display: none;">
                            <p>파일을 처리 중입니다...</p>
                            <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 30px; height: 30px; animation: spin 2s linear infinite; margin: 0 auto;"></div>
                        </div>
                        <div id="resultContent" style="display: none;">
                            <p><strong>처리 결과:</strong></p>
                            <textarea id="resultText" style="width: 100%; height: 150px; resize: vertical;" readonly></textarea>
                        </div>
                    </div>
                    <style>
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    </style>
                `
            }]
        }],

        buttons: [{
            id: 'processBtn',
            type: 'button',
            label: '파일 처리',
            onClick() {
                processHwpFile(this, editor);
            }
        }, {
            id: 'insertBtn',
            type: 'button',
            label: '에디터에 삽입',
            disabled: true,
            onClick() {
                const resultText = document.getElementById('resultText').value;
                if (resultText) {
                    editor.insertHtml(resultText);
                    this.hide();
                } else {
                    alert('삽입할 내용이 없습니다.');
                }
            }
        },
            CKEDITOR.dialog.cancelButton],

        onShow() {
            this.resetDialog();
        },

        resetDialog() {
            document.getElementById('processResult').style.display = 'none';
            document.getElementById('resultText').value = '';
            this.getButton('insertBtn').disable();
            this.getButton('processBtn').enable();
        }
    };
});

// HWP 파일 처리 클래스
class HwpFileProcessor {
    constructor(dialog, editor) {
        this.dialog = dialog;
        this.editor = editor;
        this.contextPath = this.getContextPath();
    }

    getContextPath() {
        // JSP의 contextPath를 가져오는 방법
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
            if (script.textContent.includes('contextPath')) {
                const match = script.textContent.match(/contextPath\s*=\s*['"`]([^'"`]+)['"`]/);
                if (match) return match[1];
            }
        }
        return '/'; // 기본값
    }

    async processFile() {
        const { isValid, file, processType } = this.validateInput();
        if (!isValid) return;

        this.showLoading(true);

        try {
            const result = await this.uploadFile(file, processType);
            this.handleResult(result);
        } catch (error) {
            this.handleError(error);
        } finally {
            this.showLoading(false);
        }
    }

    validateInput() {
        const fileInput = this.dialog.getContentElement('upload', 'hwpFile').getInputElement().$;
        const file = fileInput.files?.[0];

        if (!file) {
            alert('파일을 선택해주세요.');
            return { isValid: false };
        }

        const allowedExtensions = ['.hwp', '.hwpx'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

        if (!allowedExtensions.includes(fileExtension)) {
            alert('HWP 또는 HWPX 파일만 업로드 가능합니다.');
            return { isValid: false };
        }

        const processType = document.querySelector('input[name="processType"]:checked')?.value || 'original';

        return {
            isValid: true,
            file,
            processType
        };
    }

    async uploadFile(file, processType) {
        const formData = new FormData();
        formData.append('hwpFile', file);
        formData.append('processType', processType);

        const response = await fetch(`${this.contextPath}hwp/process.jsp`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    handleResult(data) {
        if (data.status === 'success') {
            this.displayResult(data.content);
            this.dialog.getButton('insertBtn').enable();
        } else {
            throw new Error(data.message || '파일 처리 중 오류가 발생했습니다.');
        }
    }

    handleError(error) {
        console.error('HWP 파일 처리 오류:', error);
        alert(`파일 처리 중 오류가 발생했습니다: ${error.message}`);
        this.dialog.getButton('processBtn').enable();
    }

    displayResult(content) {
        const resultText = document.getElementById('resultText');
        const resultContent = document.getElementById('resultContent');

        if (resultText && resultContent) {
            resultText.value = content;
            resultContent.style.display = 'block';
        }
    }

    showLoading(show) {
        const elements = {
            processResult: document.getElementById('processResult'),
            loadingMsg: document.getElementById('loadingMsg'),
            resultContent: document.getElementById('resultContent')
        };

        if (show) {
            elements.processResult.style.display = 'block';
            elements.loadingMsg.style.display = 'block';
            elements.resultContent.style.display = 'none';
            this.dialog.getButton('processBtn').disable();
        } else {
            elements.loadingMsg.style.display = 'none';
            this.dialog.getButton('processBtn').enable();
        }
    }
}

// 전역 함수 (CKEditor 대화상자에서 호출)
const processHwpFile = (dialog, editor) => {
    const processor = new HwpFileProcessor(dialog, editor);
    processor.processFile();
};
