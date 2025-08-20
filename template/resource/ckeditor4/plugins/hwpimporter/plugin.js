CKEDITOR.plugins.add('hwpimporter', {
    icons: 'hwpimporter',
    init: function(editor) {
        // 대화상자 등록
        CKEDITOR.dialog.add('hwpimportDialog', this.path + 'dialogs/hwpimporter.js');

        // 버튼 추가
        editor.ui.addButton('HWPImporter', {
            label: 'HWP 파일 가져오기',
            command: 'hwpImportCommand',
            toolbar: 'insert',
            icon: this.path + 'icons/hwpimporter.png'
        });

        // 명령어 등록
        editor.addCommand('hwpImportCommand', new CKEDITOR.dialogCommand('hwpimportDialog'));
    }
});
