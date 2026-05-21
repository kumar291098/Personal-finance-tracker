package com.finance.security;

import com.finance.model.User;
import com.finance.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class PasswordMigrationRunner implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public PasswordMigrationRunner(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        List<User> allUsers = userRepository.findAll();
        int updatedCount = 0;

        for (User user : allUsers) {
            String currentPassword = user.getPassword();
            // BCrypt hashes always start with $2a$ (or $2b$, $2y$) and are 60 characters long.
            // If the password doesn't look like a BCrypt hash, we encrypt it.
            if (currentPassword != null && !currentPassword.startsWith("$2a$")) {
                user.setPassword(passwordEncoder.encode(currentPassword));
                userRepository.save(user);
                updatedCount++;
            }
        }

        if (updatedCount > 0) {
            System.out.println("✅ SECURITY UPDATE: Automatically migrated " + updatedCount + " users from plain-text passwords to secure BCrypt hashes!");
        }
    }
}
