package com.finance.service;

import com.finance.model.AccessLevel;
import com.finance.model.AccessPolicy;
import com.finance.repository.AccessPolicyRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class AccessPolicyService {

    private static final List<String> ALL_PAGES = List.of(
        "dashboard", "transactions", "analytics", "chat", "categories", "subscription", "profile", "access", "monitoring"
    );

    private static final Map<AccessLevel, List<String>> DEFAULT_ALLOWED_PAGES = Map.of(
        AccessLevel.ADMIN, ALL_PAGES,
        AccessLevel.SUBSCRIBER, List.of("dashboard", "transactions", "analytics", "chat", "categories", "subscription", "profile"),
        AccessLevel.FREE, List.of("dashboard", "transactions", "subscription", "profile")
    );

    @Autowired
    private AccessPolicyRepository accessPolicyRepository;

    public List<String> getAllPages() {
        return ALL_PAGES;
    }

    public List<String> getAllowedPages(AccessLevel accessLevel) {
        if (accessLevel == AccessLevel.ADMIN) {
            return ALL_PAGES;
        }

        AccessPolicy policy = accessPolicyRepository.findByAccessLevel(accessLevel)
            .orElseGet(() -> createDefaultPolicy(accessLevel));

        return parsePages(policy.getAllowedPages());
    }

    public List<AccessPolicy> getAllPolicies() {
        ensureDefaults();
        return accessPolicyRepository.findAll();
    }

    public AccessPolicy updatePolicy(AccessLevel accessLevel, List<String> requestedPages) {
        if (accessLevel == AccessLevel.ADMIN) {
            return accessPolicyRepository.findByAccessLevel(AccessLevel.ADMIN)
                .orElseGet(() -> createDefaultPolicy(AccessLevel.ADMIN));
        }

        Set<String> cleanPages = new LinkedHashSet<>();
        for (String page : requestedPages) {
            if (ALL_PAGES.contains(page) && !"access".equals(page) && !"monitoring".equals(page)) {
                cleanPages.add(page);
            }
        }
        cleanPages.add("profile");

        AccessPolicy policy = accessPolicyRepository.findByAccessLevel(accessLevel)
            .orElseGet(() -> createDefaultPolicy(accessLevel));
        policy.setAllowedPages(String.join(",", cleanPages));
        return accessPolicyRepository.save(policy);
    }

    public void ensureDefaults() {
        for (AccessLevel accessLevel : AccessLevel.values()) {
            accessPolicyRepository.findByAccessLevel(accessLevel)
                .orElseGet(() -> createDefaultPolicy(accessLevel));
        }
    }

    private AccessPolicy createDefaultPolicy(AccessLevel accessLevel) {
        AccessPolicy policy = new AccessPolicy(
            accessLevel,
            String.join(",", DEFAULT_ALLOWED_PAGES.getOrDefault(accessLevel, DEFAULT_ALLOWED_PAGES.get(AccessLevel.FREE)))
        );
        return accessPolicyRepository.save(policy);
    }

    private List<String> parsePages(String pages) {
        if (pages == null || pages.isBlank()) {
            return List.of("profile");
        }

        return Arrays.stream(pages.split(","))
            .map(String::trim)
            .filter(page -> !page.isEmpty())
            .filter(ALL_PAGES::contains)
            .distinct()
            .toList();
    }
}
