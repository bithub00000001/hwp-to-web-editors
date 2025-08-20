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

<%
    response.setContentType("application/json");
    response.setCharacterEncoding("UTF-8");
    
    final String OPENAI_API_KEY = System.getProperty("openai.api.key", "여기에 api 키 넣어서 테스트");
    
    Gson gson = new Gson();
    Map<String, Object> result = new HashMap<>();
    
    try {
        // JSON 요청 데이터 읽기
        BufferedReader reader = request.getReader();
        StringBuilder jsonBuilder = new StringBuilder();
        String line;
        
        while ((line = reader.readLine()) != null) {
            jsonBuilder.append(line);
        }
        
        JsonObject requestData = JsonParser.parseString(jsonBuilder.toString()).getAsJsonObject();
        String text = requestData.get("text").getAsString();
        String processType = requestData.get("processType").getAsString();
        
        if ("summary".equals(processType)) {
            String summary = summarizeWithGPT(text, OPENAI_API_KEY);
            result.put("status", "success");
            result.put("content", summary);
            result.put("processType", processType);
        } else {
            result.put("status", "error");
            result.put("message", "지원하지 않는 처리 타입입니다.");
        }
        
    } catch (Exception e) {
        result.put("status", "error");
        result.put("message", "요약 처리 중 오류가 발생했습니다: " + e.getMessage());
        e.printStackTrace();
    }
    
    out.print(gson.toJson(result));
%>

<%!
    // HttpURLConnection을 사용한 GPT API 호출
    private String summarizeWithGPT(String originalText, String apiKey) throws Exception {
        if (apiKey == null || apiKey.equals("여기에 api 키 넣어서 테스트")) {
            return simpleLocalSummary(originalText);
        }
        
        String textToSummarize = originalText;
        if (originalText.length() > 8000) {
            textToSummarize = originalText.substring(0, 8000) + "...";
        }
        
        // JSON 요청 데이터 생성
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
        
        // HttpURLConnection 사용
        URL url = new URL("https://api.openai.com/v1/chat/completions");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Authorization", "Bearer " + apiKey);
        conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
        conn.setDoOutput(true);
        
        // 요청 데이터 전송
        try (OutputStream os = conn.getOutputStream()) {
            byte[] input = jsonRequest.getBytes(StandardCharsets.UTF_8);
            os.write(input, 0, input.length);
        }
        
        // 응답 읽기
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
    
    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#x27;");
    }
%>
