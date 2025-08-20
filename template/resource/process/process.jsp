<%@ page language="java" contentType="application/json; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page import="java.io.*" %>
<%@ page import="java.util.*" %>
<%@ page import="java.nio.file.*" %>
<%@ page import="org.apache.commons.fileupload.*" %>
<%@ page import="org.apache.commons.fileupload.disk.*" %>
<%@ page import="org.apache.commons.fileupload.servlet.*" %>
<%@ page import="com.google.gson.*" %>
<%
    response.setContentType("application/json");
    response.setCharacterEncoding("UTF-8");
    
    Gson gson = new Gson();
    Map<String, Object> result = new HashMap<>();
    
    try {
        // 파일 업로드 처리
        if (!ServletFileUpload.isMultipartContent(request)) {
            result.put("status", "error");
            result.put("message", "멀티파트 요청이 아닙니다.");
            out.print(gson.toJson(result));
            return;
        }
        
        DiskFileItemFactory factory = new DiskFileItemFactory();
        factory.setSizeThreshold(1024 * 1024); // 1MB
        factory.setRepository(new File(System.getProperty("java.io.tmpdir")));
        
        ServletFileUpload upload = new ServletFileUpload(factory);
        upload.setHeaderEncoding("UTF-8");
        upload.setFileSizeMax(10 * 1024 * 1024); // 10MB 제한
        
        List<FileItem> items = upload.parseRequest(request);
        
        FileItem hwpFile = null;
        String processType = "original";
        
        // 업로드된 항목들 처리
        for (FileItem item : items) {
            if (item.isFormField()) {
                if ("processType".equals(item.getFieldName())) {
                    processType = item.getString("UTF-8");
                }
            } else if ("hwpFile".equals(item.getFieldName())) {
                hwpFile = item;
            }
        }
        
        if (hwpFile == null || hwpFile.getSize() == 0) {
            result.put("status", "error");
            result.put("message", "파일이 업로드되지 않았습니다.");
        } else {
            // 파일 확장자 검증
            String fileName = hwpFile.getName();
            if (!isValidHwpFile(fileName)) {
                result.put("status", "error");
                result.put("message", "HWP 또는 HWPX 파일만 업로드 가능합니다.");
            } else {
                // 임시 파일 생성
                File tempFile = createTempFile(hwpFile);
                
                try {
                    // HWP 파일 처리
                    String content = processHwpContent(tempFile, processType, fileName);
                    
                    // 성공 응답
                    Map<String, Object> data = new HashMap<>();
                    data.put("content", content);
                    data.put("processType", processType);
                    data.put("fileName", fileName);
                    data.put("fileSize", hwpFile.getSize());
                    
                    result.put("status", "success");
                    result.put("data", data);
                    result.put("content", content); // 호환성을 위해 직접 포함
                    
                } finally {
                    // 임시 파일 삭제
                    if (tempFile != null && tempFile.exists()) {
                        tempFile.delete();
                    }
                }
            }
        }
        
    } catch (Exception e) {
        result.put("status", "error");
        result.put("message", "파일 처리 중 오류가 발생했습니다: " + e.getMessage());
        e.printStackTrace();
    }
    
    out.print(gson.toJson(result));
%>

<%!
    // 파일 확장자 검증
    private boolean isValidHwpFile(String fileName) {
        if (fileName == null) return false;
        String lowerName = fileName.toLowerCase();
        return lowerName.endsWith(".hwp") || lowerName.endsWith(".hwpx");
    }
    
    // 임시 파일 생성
    private File createTempFile(FileItem hwpFile) throws Exception {
        String uploadPath = System.getProperty("java.io.tmpdir");
        File uploadDir = new File(uploadPath);
        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }
        
        String tempFileName = System.currentTimeMillis() + "_" + hwpFile.getName();
        File tempFile = new File(uploadDir, tempFileName);
        hwpFile.write(tempFile);
        
        return tempFile;
    }
    
    // HWP 파일 내용 처리 메서드
    private String processHwpContent(File file, String processType, String fileName) throws Exception {
        try {
            String originalContent = readHwpFile(file, fileName);
            
            if ("summary".equals(processType)) {
                return summarizeContent(originalContent);
            } else {
                return formatOriginalContent(originalContent);
            }
            
        } catch (Exception e) {
            throw new Exception("HWP 파일 처리 실패: " + e.getMessage(), e);
        }
    }
    
    // HWP 파일 읽기
    private String readHwpFile(File file, String fileName) throws Exception {
        String lowerName = fileName.toLowerCase();
        
        if (lowerName.endsWith(".hwpx")) {
            return readHwpxFile(file);
        } else if (lowerName.endsWith(".hwp")) {
            return readHwpLegacyFile(file);
        } else {
            throw new Exception("지원하지 않는 파일 형식입니다: " + fileName);
        }
    }
    
    // HWPX 파일 읽기 (XML 기반)
    private String readHwpxFile(File file) throws Exception {
        // 실제 구현에서는 ZIP 파일로 압축된 XML을 파싱
        // 여기서는 예시 텍스트 반환
        StringBuilder content = new StringBuilder();
        content.append("HWPX 파일에서 추출된 내용입니다.\n\n");
        content.append("첫 번째 단락: 이것은 HWPX 파일의 첫 번째 단락입니다.\n");
        content.append("두 번째 단락: HWPX는 XML 기반의 한글 문서 형식입니다.\n");
        content.append("세 번째 단락: 구조화된 문서 정보를 포함합니다.\n");
        content.append("\n문서 메타데이터:\n");
        content.append("- 파일 크기: ").append(file.length()).append(" bytes\n");
        content.append("- 수정 일시: ").append(new Date(file.lastModified())).append("\n");
        
        return content.toString();
    }
    
    // HWP 파일 읽기 (바이너리)
    private String readHwpLegacyFile(File file) throws Exception {
        // 실제 구현에서는 HWP 바이너리 형식을 파싱
        // 여기서는 예시 텍스트 반환
        StringBuilder content = new StringBuilder();
        content.append("HWP 파일에서 추출된 내용입니다.\n\n");
        content.append("제목: 한글 문서 샘플\n\n");
        content.append("본문:\n");
        content.append("이것은 HWP 파일에서 추출된 본문 내용입니다. ");
        content.append("실제 구현에서는 한글 파일의 바이너리 구조를 분석하여 ");
        content.append("텍스트와 서식 정보를 추출해야 합니다.\n\n");
        content.append("HWP 파일은 한글과컴퓨터에서 개발한 워드프로세서 형식으로, ");
        content.append("복잡한 바이너리 구조를 가지고 있습니다.\n");
        
        return content.toString();
    }
    
    // 요약 처리
    private String summarizeContent(String originalContent) {
        String[] paragraphs = originalContent.split("\n\n");
        StringBuilder summary = new StringBuilder();
        
        summary.append("<div class='hwp-summary'>");
        summary.append("<h4>📄 문서 요약</h4>");
        
        // 첫 번째 단락과 마지막 단락 사용
        if (paragraphs.length > 0) {
            summary.append("<p><strong>주요 내용:</strong></p>");
            summary.append("<p>").append(paragraphs[0].replaceAll("\n", " ").trim()).append("</p>");
            
            if (paragraphs.length > 2) {
                summary.append("<p>").append(paragraphs[paragraphs.length - 1].replaceAll("\n", " ").trim()).append("</p>");
            }
        }
        
        summary.append("<p><em>※ 이것은 자동 생성된 요약입니다.</em></p>");
        summary.append("</div>");
        
        return summary.toString();
    }
    
    // 원본 서식 유지
    private String formatOriginalContent(String originalContent) {
        StringBuilder formatted = new StringBuilder();
        
        formatted.append("<div class='hwp-content' style='line-height: 1.6; font-family: \"맑은 고딕\", \"Malgun Gothic\", sans-serif;'>");
        
        String[] lines = originalContent.split("\n");
        boolean inParagraph = false;
        
        for (String line : lines) {
            line = line.trim();
            
            if (line.isEmpty()) {
                if (inParagraph) {
                    formatted.append("</p>");
                    inParagraph = false;
                }
            } else {
                if (!inParagraph) {
                    formatted.append("<p>");
                    inParagraph = true;
                } else {
                    formatted.append("<br>");
                }
                formatted.append(escapeHtml(line));
            }
        }
        
        if (inParagraph) {
            formatted.append("</p>");
        }
        
        formatted.append("</div>");
        
        return formatted.toString();
    }
    
    // HTML 이스케이프 처리
    private String escapeHtml(String text) {
        return text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&#x27;");
    }
%>
