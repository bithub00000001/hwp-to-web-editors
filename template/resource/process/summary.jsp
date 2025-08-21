<%@ page import="java.nio.charset.StandardCharsets"%>
<%@ page import="java.io.InputStreamReader" %>
<%@ page import="java.io.BufferedReader" %>
<%@ page import="java.io.OutputStream" %>
<%@ page import="java.util.ArrayList" %>
<%@ page import="java.net.HttpURLConnection" %>
<%@ page import="com.google.gson.Gson" %>
<%@ page import="com.google.gson.JsonParser" %>
<%@ page import="com.google.gson.JsonObject" %>
<%@ page import="java.util.Map" %>
<%@ page import="java.util.HashMap" %>
<%@ page import="java.util.List" %>
<%@ page import="java.net.URL" %>
<%@ page import="java.io.File" %>
<%@ page import="java.util.zip.ZipInputStream" %>
<%@ page import="java.io.FileInputStream" %>
<%@ page import="java.util.zip.ZipEntry" %>
<%@ page import="java.io.ByteArrayOutputStream" %>
<%@ page import="java.util.Base64"%>
<%@ page import="java.io.FileOutputStream"%>

<%
    response.setHeader("Cache-Control", "no-cache");
    response.setContentType("application/json");
    response.setCharacterEncoding("UTF-8");
    
    final String OPENAI_API_KEY = System.getProperty("openai.api.key", "여기에 api 키 넣어서 테스트");
    
    Gson gson = new Gson();
    Map<String, Object> result = new HashMap<>();
    
    try {
        // Base64 데이터 받기
        String hwpData = request.getParameter("hwpData");
        String fileName = request.getParameter("fileName");
        String fileType = request.getParameter("fileType");
        String fileSizeStr = request.getParameter("fileSize");
        String processType = request.getParameter("processType");
        
        if (hwpData == null || hwpData.isEmpty()) {
            result.put("status", "error");
            result.put("message", "HWP 파일 데이터가 없습니다.");
            out.print(gson.toJson(result));
            return;
        }
        
        if (fileName == null || fileName.isEmpty()) {
            result.put("status", "error");
            result.put("message", "파일명이 없습니다.");
            out.print(gson.toJson(result));
            return;
        }
        
        // 파일 크기 체크
        long fileSize = Long.parseLong(fileSizeStr);
        if (fileSize > 50 * 1024 * 1024) { // 50MB
            result.put("status", "error");
            result.put("message", "파일 크기가 50MB를 초과합니다.");
            out.print(gson.toJson(result));
            return;
        }
        
        // Base64 디코딩
        byte[] decodedBytes = Base64.getDecoder().decode(hwpData);
        
        // 임시 파일 생성
        File tempFile = createTempFileFromBytes(decodedBytes, fileName);
        
        try {
            // HWP 파일 처리
            String extractedText = extractHwpText(tempFile, fileName);
            String processedContent;
            
            if ("summary".equals(processType)) {
                processedContent = summarizeWithGPT(extractedText, OPENAI_API_KEY);
            } else {
                processedContent = formatOriginalContent(extractedText);
            }
            
            result.put("status", "success");
            result.put("content", processedContent);
            result.put("processType", processType);
            result.put("fileName", fileName);
            result.put("originalLength", extractedText.length());
            
        } finally {
            if (tempFile != null && tempFile.exists()) {
                tempFile.delete();
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
    // Base64 디코딩된 바이트에서 임시 파일 생성
    private File createTempFileFromBytes(byte[] fileData, String fileName) throws Exception {
        String uploadPath = System.getProperty("java.io.tmpdir");
        File uploadDir = new File(uploadPath);
        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }
        
        String tempFileName = System.currentTimeMillis() + "_" + fileName;
        File tempFile = new File(uploadDir, tempFileName);
        
        try (FileOutputStream fos = new FileOutputStream(tempFile)) {
            fos.write(fileData);
            fos.flush();
        }
        
        return tempFile;
    }
    
    private String extractHwpText(File file, String fileName) throws Exception {
        String lowerName = fileName.toLowerCase();
        
        if (lowerName.endsWith(".hwpx")) {
            return extractHwpxText(file);
        } else if (lowerName.endsWith(".hwp")) {
            return extractHwpLegacyText(file);
        } else {
            throw new Exception("지원하지 않는 파일 형식입니다.");
        }
    }
    
    // HWPX 파일 텍스트 추출
    private String extractHwpxText(File file) throws Exception {
        StringBuilder text = new StringBuilder();
        
        try (ZipInputStream zis = new ZipInputStream(new FileInputStream(file))) {
            ZipEntry entry;
            
            while ((entry = zis.getNextEntry()) != null) {
                if (entry.getName().startsWith("Contents/section") && entry.getName().endsWith(".xml")) {
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    byte[] buffer = new byte[1024];
                    int len;
                    while ((len = zis.read(buffer)) > 0) {
                        baos.write(buffer, 0, len);
                    }
                    
                    String xmlContent = baos.toString(StandardCharsets.UTF_8);
                    String sectionText = extractTextFromXML(xmlContent);
                    text.append(sectionText).append("\n");
                }
                zis.closeEntry();
            }
        }
        
        return text.toString().trim();
    }
    
    // HWP 파일 텍스트 추출
    private String extractHwpLegacyText(File file) throws Exception {
        StringBuilder text = new StringBuilder();
        
        try (FileInputStream fis = new FileInputStream(file)) {
            byte[] buffer = new byte[8192];
            int bytesRead;
            
            while ((bytesRead = fis.read(buffer)) != -1) {
                String chunk = new String(buffer, 0, bytesRead, StandardCharsets.UTF_16LE);
                
                for (char c : chunk.toCharArray()) {
                    if (Character.UnicodeBlock.of(c) == Character.UnicodeBlock.HANGUL_SYLLABLES ||
                        Character.UnicodeBlock.of(c) == Character.UnicodeBlock.HANGUL_JAMO ||
                        Character.UnicodeBlock.of(c) == Character.UnicodeBlock.HANGUL_COMPATIBILITY_JAMO ||
                        Character.isLetterOrDigit(c) ||
                        Character.isWhitespace(c) ||
                        ".,!?;:\"'()[]{}~`@#$%^&*-_+=|\\/<>".indexOf(c) >= 0) {
                        text.append(c);
                    }
                }
            }
        }
        
        return text.toString().replaceAll("\\s+", " ").trim();
    }
    
    // XML에서 텍스트 추출
    private String extractTextFromXML(String xmlContent) {
        return xmlContent.replaceAll("<[^>]*>", " ").replaceAll("\\s+", " ").trim();
    }
    
    private String summarizeWithGPT(String originalText, String apiKey) throws Exception {
        if (apiKey == null || apiKey.equals("your-api-key-here")) {
            return simpleLocalSummary(originalText);
        }
        
        String textToSummarize = originalText;
        if (originalText.length() > 8000) {
            textToSummarize = originalText.substring(0, 8000) + "...";
        }
        
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", "gpt-3.5-turbo");
        requestBody.put("max_tokens", 500);
        requestBody.put("temperature", 0.7);
        
        List<Map<String, String>> messages = new ArrayList<>();
        Map<String, String> systemMessage = new HashMap<>();
        systemMessage.put("role", "system");
        systemMessage.put("content", "당신은 한국어 문서를 요약하는 전문가입니다. 주요 내용을 3-4개의 문단으로 간결하게 요약해주세요.");
        
        Map<String, String> userMessage = new HashMap<>();
        userMessage.put("role", "user");
        userMessage.put("content", "다음 문서를 요약해주세요:\n\n" + textToSummarize);
        
        messages.add(systemMessage);
        messages.add(userMessage);
        requestBody.put("messages", messages);
        
        Gson gson = new Gson();
        String jsonRequest = gson.toJson(requestBody);
        
        URL url = new URL("https://api.openai.com/v1/chat/completions");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Authorization", "Bearer " + apiKey);
        conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
        conn.setDoOutput(true);
        
        try (OutputStream os = conn.getOutputStream()) {
            byte[] input = jsonRequest.getBytes(StandardCharsets.UTF_8);
            os.write(input, 0, input.length);
        }
        
        int responseCode = conn.getResponseCode();
        if (responseCode != HttpURLConnection.HTTP_OK) {
            throw new Exception("GPT API 호출 실패: " + responseCode);
        }
        
        StringBuilder response = new StringBuilder();
        try (BufferedReader br = new BufferedReader(
            new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
            String responseLine;
            while ((responseLine = br.readLine()) != null) {
                response.append(responseLine.trim());
            }
        }
        
        JsonObject jsonResponse = JsonParser.parseString(response.toString()).getAsJsonObject();
        
        if (jsonResponse.has("choices") && !jsonResponse.getAsJsonArray("choices").isEmpty()) {
            JsonObject choice = jsonResponse.getAsJsonArray("choices").get(0).getAsJsonObject();
            JsonObject message = choice.getAsJsonObject("message");
            String summary = message.get("content").getAsString();
            
            return formatSummaryContent(summary);
        } else {
            throw new Exception("GPT 응답에서 요약을 찾을 수 없습니다.");
        }
    }
    
    private String simpleLocalSummary(String text) {
        String[] sentences = text.split("[.!?]");
        StringBuilder summary = new StringBuilder();
        
        summary.append("<div class='hwp-summary' style='border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px; background: #f9f9f9;'>");
        summary.append("<h4 style='color: #2c3e50; margin-bottom: 15px;'>📄 문서 요약 (로컬 생성)</h4>");
        
        if (sentences.length >= 3) {
            summary.append("<p>").append(escapeHtml(sentences[0].trim())).append(".</p>");
            summary.append("<p>").append(escapeHtml(sentences[sentences.length / 2].trim())).append(".</p>");
            summary.append("<p>").append(escapeHtml(sentences[sentences.length - 1].trim())).append(".</p>");
        }
        
        summary.append("<p><em>※ API 키가 설정되지 않아 로컬 요약을 사용했습니다.</em></p>");
        summary.append("</div>");
        
        return summary.toString();
    }
    
    private String formatSummaryContent(String summary) {
        StringBuilder formatted = new StringBuilder();
        
        formatted.append("<div class='hwp-summary' style='border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px; background: #f9f9f9;'>");
        formatted.append("<h4 style='color: #2c3e50; margin-bottom: 15px;'>🤖 AI 요약</h4>");
        
        String[] paragraphs = summary.split("\n");
        for (String paragraph : paragraphs) {
            if (!paragraph.trim().isEmpty()) {
                formatted.append("<p style='line-height: 1.6; margin-bottom: 10px;'>")
                    .append(escapeHtml(paragraph.trim()))
                    .append("</p>");
            }
        }
        
        formatted.append("<p style='font-size: 0.9em; color: #666; margin-top: 15px;'>");
        formatted.append("<em>※ 이 요약은 OpenAI GPT를 사용하여 생성되었습니다.</em>");
        formatted.append("</p>");
        formatted.append("</div>");
        
        return formatted.toString();
    }
    
    private String formatOriginalContent(String originalContent) {
        StringBuilder formatted = new StringBuilder();
        
        formatted.append("<div class='hwp-content' style='line-height: 1.8; font-family: \"맑은 고딕\", \"Malgun Gothic\", sans-serif;'>");
        
        String[] paragraphs = originalContent.split("\n\n");
        for (String paragraph : paragraphs) {
            if (!paragraph.trim().isEmpty()) {
                formatted.append("<p style='margin-bottom: 15px; text-align: justify;'>")
                    .append(escapeHtml(paragraph.trim().replaceAll("\n", " ")))
                    .append("</p>");
            }
        }
        
        formatted.append("</div>");
        
        return formatted.toString();
    }
    
    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#x27;");
    }
%>
