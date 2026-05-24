package com.finance.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.finance.model.Transaction;
import com.finance.model.User;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class FinancialAiService {
    private static final ZoneId APP_ZONE = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd MMM yyyy");
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm");

    private final RestClient restClient;

    @Value("${ai.provider:openai}")
    private String aiProvider;

    @Value("${openai.api.key:}")
    private String openAiApiKey;

    @Value("${openai.model:gpt-5-mini}")
    private String openAiModel;

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @Value("${gemini.model:gemini-2.5-flash}")
    private String geminiModel;

    public FinancialAiService(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder.build();
    }

    public String reply(String message, User user, List<Transaction> transactions) {
        if (message == null || message.trim().isEmpty()) {
            return "Ask me about spending, savings, budgets, recent transactions, or your membership.";
        }

        String profileAnswer = answerProfileLookup(message, user);
        if (profileAnswer != null) {
            return profileAnswer;
        }

        String directAnswer = answerTransactionLookup(message, transactions);
        if (directAnswer != null) {
            return directAnswer;
        }

        String summary = buildTransactionSummary(transactions);
        String userContext = buildUserContext(user);
        String transactionContext = buildTransactionContext(transactions);

        try {
            if ("gemini".equalsIgnoreCase(aiProvider)) {
                if (geminiApiKey == null || geminiApiKey.isBlank()) {
                    return fallbackReply(message, summary);
                }
                return callGemini(message.trim(), summary, userContext, transactionContext);
            }

            if (openAiApiKey == null || openAiApiKey.isBlank()) {
                return fallbackReply(message, summary);
            }
            return callOpenAi(message.trim(), summary, userContext, transactionContext);
        } catch (Exception error) {
            return "I could not reach the AI service, but here is your current snapshot: " + summary;
        }
    }

    private String answerProfileLookup(String message, User user) {
        String normalizedMessage = message.toLowerCase(Locale.ROOT);
        boolean asksName = normalizedMessage.contains("my name")
                || normalizedMessage.contains("who am i")
                || normalizedMessage.contains("whose finance");
        boolean asksMembership = normalizedMessage.contains("membership")
                || normalizedMessage.contains("premium")
                || normalizedMessage.contains("free user")
                || normalizedMessage.contains("access level")
                || normalizedMessage.contains("subscription");

        if (!asksName && !asksMembership) {
            return null;
        }

        if (user == null) {
            return "I cannot read the current profile right now.";
        }

        if (asksName && asksMembership) {
            return "This finance tracker is for " + getDisplayName(user)
                    + ". Membership: " + getMembership(user)
                    + ". Subscription ends: " + formatSubscriptionEnd(user.getSubscriberUntil()) + ".";
        }

        if (asksName) {
            return "This finance tracker is for " + getDisplayName(user) + ".";
        }

        return "Membership: " + getMembership(user)
                + ". Subscription ends: " + formatSubscriptionEnd(user.getSubscriberUntil()) + ".";
    }

    private String answerTransactionLookup(String message, List<Transaction> transactions) {
        String normalizedMessage = message.toLowerCase(Locale.ROOT).trim();

        Optional<String> periodAnswer = answerPeriodTransactionLookup(normalizedMessage, transactions);
        if (periodAnswer.isPresent()) {
            return periodAnswer.get();
        }

        Integer requestedCount = extractRequestedCount(normalizedMessage);
        if (requestedCount != null && (
                normalizedMessage.contains("last")
                        || normalizedMessage.contains("recent")
                        || normalizedMessage.contains("latest")
        ) && !normalizedMessage.contains("day")) {
            List<Transaction> recentTransactions = transactions.stream()
                    .sorted(Comparator
                            .comparing(Transaction::getTransactionDate, Comparator.nullsLast(Comparator.reverseOrder()))
                            .thenComparing(Transaction::getId, Comparator.nullsLast(Comparator.reverseOrder())))
                    .limit(requestedCount)
                    .toList();

            if (recentTransactions.isEmpty()) {
                return "I found no transactions yet.";
            }

            return "Last " + recentTransactions.size() + " transactions:\n" + formatTransactions(recentTransactions);
        }

        return null;
    }

    private Optional<String> answerPeriodTransactionLookup(String normalizedMessage, List<Transaction> transactions) {
        LocalDate today = LocalDate.now(APP_ZONE);

        if (normalizedMessage.contains("today")) {
            return Optional.of(formatPeriodResponse(
                    "today",
                    today,
                    today,
                    normalizedMessage,
                    transactions));
        }

        if (normalizedMessage.contains("yesterday")) {
            LocalDate yesterday = today.minusDays(1);
            return Optional.of(formatPeriodResponse(
                    "yesterday",
                    yesterday,
                    yesterday,
                    normalizedMessage,
                    transactions));
        }

        Integer dayCount = extractRequestedDayCount(normalizedMessage);
        if (dayCount != null) {
            LocalDate startDate = today.minusDays(dayCount - 1L);
            return Optional.of(formatPeriodResponse(
                    "last " + dayCount + " days",
                    startDate,
                    today,
                    normalizedMessage,
                    transactions));
        }

        return Optional.empty();
    }

    private Integer extractRequestedCount(String message) {
        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("\\b(\\d{1,2})\\b").matcher(message);
        if (!matcher.find()) {
            return null;
        }

        int count = Integer.parseInt(matcher.group(1));
        return Math.max(1, Math.min(count, 10));
    }

    private Integer extractRequestedDayCount(String message) {
        java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("\\blast\\s+(\\d{1,2})\\s+day[s]?\\b")
                .matcher(message);
        if (!matcher.find()) {
            return null;
        }

        int count = Integer.parseInt(matcher.group(1));
        return Math.max(1, Math.min(count, 30));
    }

    private String formatPeriodResponse(
            String label,
            LocalDate startDate,
            LocalDate endDate,
            String normalizedMessage,
            List<Transaction> transactions) {
        boolean expensesOnly = normalizedMessage.contains("expense")
                || normalizedMessage.contains("expenses")
                || normalizedMessage.contains("spent")
                || normalizedMessage.contains("spend")
                || normalizedMessage.contains("spends")
                || normalizedMessage.contains("spending");
        boolean incomeOnly = !expensesOnly && (
                normalizedMessage.contains("income") || normalizedMessage.contains("earned"));

        List<Transaction> matchedTransactions = transactions.stream()
                .filter(transaction -> transaction.getTransactionDate() != null)
                .filter(transaction -> !transaction.getTransactionDate().isBefore(startDate)
                        && !transaction.getTransactionDate().isAfter(endDate))
                .filter(transaction -> !expensesOnly || "EXPENSE".equalsIgnoreCase(transaction.getType()))
                .filter(transaction -> !incomeOnly || "INCOME".equalsIgnoreCase(transaction.getType()))
                .sorted(Comparator
                        .comparing(Transaction::getTransactionDate, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Transaction::getId, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        String dateLabel = startDate.format(DATE_FORMATTER)
                + (startDate.equals(endDate) ? "" : " to " + endDate.format(DATE_FORMATTER));

        if (matchedTransactions.isEmpty()) {
            return "I found no " + transactionWord(expensesOnly, incomeOnly)
                    + " for " + label + " (" + dateLabel + ").";
        }

        double total = matchedTransactions.stream()
                .mapToDouble(transaction -> transaction.getAmount() == null ? 0 : transaction.getAmount())
                .sum();

        if (expensesOnly) {
            return capitalize(label) + " expenses (" + dateLabel + "): INR " + Math.round(total)
                    + "\n" + formatTransactions(matchedTransactions);
        }

        if (incomeOnly) {
            return capitalize(label) + " income (" + dateLabel + "): INR " + Math.round(total)
                    + "\n" + formatTransactions(matchedTransactions);
        }

        return capitalize(label) + " transactions (" + dateLabel + "):\n"
                + formatTransactions(matchedTransactions);
    }

    private String transactionWord(boolean expensesOnly, boolean incomeOnly) {
        if (expensesOnly) {
            return "expenses";
        }
        if (incomeOnly) {
            return "income transactions";
        }
        return "transactions";
    }

    private String capitalize(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return Character.toUpperCase(value.charAt(0)) + value.substring(1);
    }

    private String formatTransactions(List<Transaction> transactions) {
        return transactions.stream()
                .map(transaction -> "- " + transaction.getTransactionDate()
                        + " | " + transaction.getType()
                        + " | INR " + Math.round(transaction.getAmount() == null ? 0 : transaction.getAmount())
                        + " | " + nullSafe(transaction.getCategory())
                        + " | " + nullSafe(transaction.getDescription()))
                .collect(Collectors.joining("\n"));
    }

    private String nullSafe(String value) {
        return value == null || value.isBlank() ? "No details" : value;
    }

    private String callOpenAi(String message, String summary, String userContext, String transactionContext) {
        Map<String, Object> requestBody = Map.of(
                "model", openAiModel,
                "input", buildPrompt(message, summary, userContext, transactionContext)
        );

        JsonNode response = restClient.post()
                .uri("https://api.openai.com/v1/responses")
                .header("Authorization", "Bearer " + openAiApiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(JsonNode.class);

        if (response == null) {
            return "I could not prepare a response right now.";
        }

        JsonNode outputText = response.get("output_text");
        if (outputText != null && !outputText.asText().isBlank()) {
            return outputText.asText();
        }

        return extractTextFromOpenAiOutput(response);
    }

    private String callGemini(String message, String summary, String userContext, String transactionContext) {
        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", buildPrompt(message, summary, userContext, transactionContext))
                        ))
                ),
                "generationConfig", Map.of(
                        "temperature", 0.2,
                        "maxOutputTokens", 500
                )
        );

        JsonNode response = restClient.post()
                .uri("https://generativelanguage.googleapis.com/v1beta/models/"
                        + geminiModel + ":generateContent?key=" + geminiApiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(JsonNode.class);

        return extractGeminiText(response);
    }

    private String buildPrompt(String message, String summary, String userContext, String transactionContext) {
        return """
                You are a careful personal finance assistant inside a finance tracker app.
                Answer naturally and helpfully, but do not invent transactions or amounts.
                Use only the app context, the user's transaction summary, the recent transaction context, and the current question.
                If the provided data is not enough, say exactly what is missing.
                You may answer questions about the current user's name, membership level, and subscription end date from the app context.
                Interpret relative time words like today, yesterday, and last N days using the app date.
                Do not give legal, tax, or investment advice.

                App date: %s
                App context: %s
                Transaction summary: %s
                Recent transaction context: %s
                User question: %s
                """.formatted(
                LocalDate.now(APP_ZONE).format(DATE_FORMATTER),
                userContext,
                summary,
                transactionContext,
                message);
    }

    private String extractTextFromOpenAiOutput(JsonNode response) {
        JsonNode output = response.get("output");
        if (output == null || !output.isArray()) {
            return "I could not prepare a response right now.";
        }

        StringBuilder builder = new StringBuilder();
        output.forEach(item -> {
            JsonNode content = item.get("content");
            if (content != null && content.isArray()) {
                content.forEach(contentItem -> {
                    JsonNode text = contentItem.get("text");
                    if (text != null && !text.asText().isBlank()) {
                        builder.append(text.asText()).append("\n");
                    }
                });
            }
        });

        return builder.isEmpty() ? "I could not prepare a response right now." : builder.toString().trim();
    }

    private String extractGeminiText(JsonNode response) {
        if (response == null) {
            return "I could not prepare a response right now.";
        }

        JsonNode candidates = response.get("candidates");
        if (candidates == null || !candidates.isArray() || candidates.isEmpty()) {
            return "I could not prepare a response right now.";
        }

        JsonNode parts = candidates.get(0).path("content").path("parts");
        if (!parts.isArray()) {
            return "I could not prepare a response right now.";
        }

        StringBuilder builder = new StringBuilder();
        parts.forEach(part -> {
            JsonNode text = part.get("text");
            if (text != null && !text.asText().isBlank()) {
                builder.append(text.asText()).append("\n");
            }
        });

        return builder.isEmpty() ? "I could not prepare a response right now." : builder.toString().trim();
    }

    private String buildTransactionSummary(List<Transaction> transactions) {
        double income = transactions.stream()
                .filter(transaction -> "INCOME".equals(transaction.getType()))
                .mapToDouble(transaction -> transaction.getAmount() == null ? 0 : transaction.getAmount())
                .sum();

        double expenses = transactions.stream()
                .filter(transaction -> "EXPENSE".equals(transaction.getType()))
                .mapToDouble(transaction -> transaction.getAmount() == null ? 0 : transaction.getAmount())
                .sum();

        String topCategories = transactions.stream()
                .filter(transaction -> "EXPENSE".equals(transaction.getType()))
                .filter(transaction -> transaction.getCategory() != null && !transaction.getCategory().isBlank())
                .collect(Collectors.groupingBy(Transaction::getCategory, Collectors.summingDouble(
                        transaction -> transaction.getAmount() == null ? 0 : transaction.getAmount()
                )))
                .entrySet()
                .stream()
                .sorted(Map.Entry.<String, Double>comparingByValue(Comparator.reverseOrder()))
                .limit(3)
                .map(entry -> entry.getKey() + ": INR " + Math.round(entry.getValue()))
                .collect(Collectors.joining(", "));

        return "income INR " + Math.round(income)
                + ", expenses INR " + Math.round(expenses)
                + ", balance INR " + Math.round(income - expenses)
                + ", transactions " + transactions.size()
                + (topCategories.isBlank() ? "" : ", top expense categories " + topCategories);
    }

    private String buildTransactionContext(List<Transaction> transactions) {
        List<Transaction> recentTransactions = transactions.stream()
                .filter(transaction -> transaction.getTransactionDate() != null)
                .sorted(Comparator
                        .comparing(Transaction::getTransactionDate, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Transaction::getId, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(25)
                .toList();

        if (recentTransactions.isEmpty()) {
            return "no transactions available";
        }

        return recentTransactions.stream()
                .map(transaction -> transaction.getTransactionDate()
                        + " | " + nullSafe(transaction.getType())
                        + " | INR " + Math.round(transaction.getAmount() == null ? 0 : transaction.getAmount())
                        + " | " + nullSafe(transaction.getCategory())
                        + " | " + nullSafe(transaction.getDescription()))
                .collect(Collectors.joining("; "));
    }

    private String buildUserContext(User user) {
        if (user == null) {
            return "current user profile unavailable";
        }

        return "current user name " + nullSafe(getDisplayName(user))
                + ", username " + nullSafe(user.getUsername())
                + ", membership " + getMembership(user)
                + ", subscription ends " + formatSubscriptionEnd(user.getSubscriberUntil());
    }

    private String getDisplayName(User user) {
        String displayName = Stream.of(user.getFirstName(), user.getLastName())
                .filter(value -> value != null && !value.isBlank())
                .collect(Collectors.joining(" "))
                .trim();

        if (displayName.isBlank()) {
            displayName = user.getUsername();
        }

        return nullSafe(displayName);
    }

    private String getMembership(User user) {
        return user.getAccessLevel() == null ? "not set" : user.getAccessLevel().name();
    }

    private String formatSubscriptionEnd(LocalDateTime subscriberUntil) {
        if (subscriberUntil == null) {
            return "not set";
        }

        return subscriberUntil.format(DATE_TIME_FORMATTER);
    }

    private String fallbackReply(String message, String summary) {
        String normalizedMessage = message.toLowerCase(Locale.ROOT);
        if (normalizedMessage.contains("budget")) {
            return "AI is not configured yet, but based on your saved data you can start with this snapshot: "
                    + summary + ". Try setting one monthly limit for your biggest expense category first.";
        }

        if (normalizedMessage.contains("save") || normalizedMessage.contains("saving")) {
            return "AI is not configured yet, but here is a simple savings check: "
                    + summary + ". If expenses are close to income, reduce the highest flexible category first.";
        }

        String provider = "gemini".equalsIgnoreCase(aiProvider) ? "GEMINI_API_KEY" : "OPENAI_API_KEY";
        return "AI is not configured yet. Current finance snapshot: " + summary
                + ". Set " + provider + " on the backend to enable full AI answers.";
    }
}
