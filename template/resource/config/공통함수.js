/**
 * ckEditor의 Config를 관리하기 위한 공통 함수
 * @returns {Object} CKEditor 설정 객체
 */
function getEditorConfig() {
    return {
        customConfig: "", // 기본 config.js 무시
        extraPlugins: "a11yhelp,about,clipboard,colordialog,copyformatting,customupload,dialog,div,filetools,find,forms,iframe,lineutils,link,liststyle,magicline,pagebreak,pastefromword,preview,scayt,showblocks,smiley,specialchar,table,tabletools,templates,uploadwidget,widget,widgetselection,wsc,hwpimporter", // hwpimporter 추가
        removePlugins: "",
        allowedContent: true,
        toolbar: [
            {name: "document", items: ["Source", "-", "NewPage", "Preview", "Print", "-", "Templates"]},
            {name: "clipboard", items: ["Cut", "Copy", "Paste", "PasteText", "PasteFromWord", "-", "Undo", "Redo"]},
            {name: "editing", items: ["Find", "Replace", "-", "SelectAll", "-", "Scayt"]},
            {name: "forms", items: ["Form", "Checkbox", "Radio", "TextField", "Textarea", "Select", "Button", "ImageButton", "HiddenField"]},
            "/",
            {name: "basicstyles", items: ["Bold", "Italic", "Underline", "Strike", "Subscript", "Superscript", "-", "CopyFormatting", "RemoveFormat"]},
            {name: "paragraph", items: ["NumberedList", "BulletedList", "-", "Outdent", "Indent", "-", "Blockquote", "CreateDiv", "-", "JustifyLeft", "JustifyCenter", "JustifyRight", "JustifyBlock", "-", "BidiLtr", "BidiRtl"]},
            {name: "links", items: ["Link", "Unlink", "Anchor"]},
            {name: "insert", items: ["CustomUpload", "Table", "HorizontalRule", "Smiley", "SpecialChar", "PageBreak", "Iframe", "HWPImporter"]}, // HWPImporter 추가
            "/",
            {name: "styles", items: ["Styles", "Format", "Font", "FontSize"]},
            {name: "colors", items: ["TextColor", "BGColor"]},
            {name: "tools", items: ["Maximize", "ShowBlocks"]}
        ],
        height: 400,
        width: "100%",
    };
}
