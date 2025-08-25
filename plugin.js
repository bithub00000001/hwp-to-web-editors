CKEDITOR.plugins.add('pdfExtractText', {
    icons: 'pdfExtractText',
    init: function(editor) {
        // 대화상자 등록
        CKEDITOR.dialog.add('pdfExtractTextDialog', this.path + 'dialogs/pdfExtractText.js');

        // 버튼 추가
        editor.ui.addButton('PdfExtractText', {
            label: 'PDF 텍스트 추출',
            command: 'pdfExtractTextCommand',
            toolbar: 'insert',
            icon: this.path + 'icons/pdfExtractText.png'
        });

        // 명령어 등록
        editor.addCommand('pdfExtractTextCommand', new CKEDITOR.dialogCommand('pdfExtractTextDialog'));
    }
});
