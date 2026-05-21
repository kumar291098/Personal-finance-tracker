package com.finance.controller;
import com.finance.util.JwtUtil;
import com.finance.dto.LoginRequest;
import com.finance.model.AccessLevel;
import com.finance.model.User;
import com.finance.repository.UserRepository;
import com.finance.service.AccessPolicyService;
import com.finance.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.data.redis.core.StringRedisTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final SecureRandom OTP_RANDOM = new SecureRandom();
    private static final Map<String, PasswordResetOtp> PASSWORD_RESET_OTPS = new ConcurrentHashMap<>();
    private static final int OTP_EXPIRY_MINUTES = 10;

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private JwtUtil jwtUtil;
    @Autowired
    private EmailService emailService;
    @Autowired
    private AccessPolicyService accessPolicyService;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private Optional<StringRedisTemplate> redisTemplate;
    @Autowired
    private ObjectMapper objectMapper;

    @Value("${app.password-reset.expose-otp:false}")
    private boolean exposeOtp;
    // 🔐 Login endpoint
    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody LoginRequest request) {
         User user = userRepository.findByUsername(request.getUsername())
            .orElseThrow(() -> new RuntimeException("Invalid username"));

    // Compare hashed password
    if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
        throw new RuntimeException("Invalid password");
    }

    // Generate JWT token
    String token = jwtUtil.generateToken(user.getUsername(), user.getId(), user.getAccessLevel().name());

    // Send token and user info to frontend
    Map<String, Object> response = new HashMap<>();
    response.put("token", token);
    response.put("userId", user.getId());
    response.put("username", user.getUsername());
    response.put("firstName", user.getFirstName() == null ? "" : user.getFirstName());
    response.put("accessLevel", user.getAccessLevel().name());
    response.put("subscriberUntil", user.getSubscriberUntil() == null ? "" : user.getSubscriberUntil().toString());
    response.put("allowedPages", accessPolicyService.getAllowedPages(user.getAccessLevel()));

    return ResponseEntity.ok(response);
    }

    // 📝 Register endpoint
    @PostMapping("/register")
    public Map<String, Object> register(@RequestBody Map<String, String> data) {
        String username = data.get("username");
        String password = data.get("password");
        String email = normalize(data.get("email"));
        String phone = normalize(data.get("phone"));

        Map<String, Object> response = new HashMap<>();

        if (username == null || password == null) {
            response.put("success", false);
            response.put("message", "Missing username or password");
            return response;
        }

        if (userRepository.findByUsername(username).isPresent()) {
            response.put("success", false);
            response.put("message", "Username already exists");
            return response;
        }

        if (email != null && userRepository.findByEmail(email).isPresent()) {
            response.put("success", false);
            response.put("message", "Email already exists");
            return response;
        }

        if (phone != null && userRepository.findByPhone(phone).isPresent()) {
            response.put("success", false);
            response.put("message", "Phone number already exists");
            return response;
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPhone(phone);
        user.setPassword(passwordEncoder.encode(password)); // encode password
        user.setAccessLevel("demo".equalsIgnoreCase(username) ? AccessLevel.ADMIN : AccessLevel.FREE);
        userRepository.save(user);

        response.put("success", true);
        response.put("message", "User registered successfully");
        response.put("userId", user.getId());
        response.put("username", user.getUsername());
        response.put("firstName", user.getFirstName() == null ? "" : user.getFirstName());
        response.put("accessLevel", user.getAccessLevel().name());
        response.put("subscriberUntil", user.getSubscriberUntil() == null ? "" : user.getSubscriberUntil().toString());
        response.put("allowedPages", accessPolicyService.getAllowedPages(user.getAccessLevel()));
        return response;
    }

    @PostMapping("/forgot-password/request-otp")
    public ResponseEntity<?> requestPasswordResetOtp(@RequestBody Map<String, String> data) {
        String identifier = normalize(data.get("identifier"));

        if (identifier == null) {
            return ResponseEntity.badRequest().body("Enter your email, phone, or username.");
        }

        Optional<User> userResult = userRepository.findByEmail(identifier)
            .or(() -> userRepository.findByPhone(identifier))
            .or(() -> userRepository.findByUsername(identifier));

        if (userResult.isEmpty()) {
            return ResponseEntity.badRequest().body("No account found for that email, phone, or username.");
        }

        String otp = String.format("%06d", OTP_RANDOM.nextInt(1_000_000));
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES);
        PasswordResetOtp resetOtp = new PasswordResetOtp(userResult.get().getId(), otp, expiresAt);
        
        if (redisTemplate.isPresent()) {
            try {
                redisTemplate.get().opsForValue().set("otp:" + identifier.toLowerCase(), objectMapper.writeValueAsString(resetOtp), Duration.ofMinutes(OTP_EXPIRY_MINUTES));
            } catch (Exception e) {
                PASSWORD_RESET_OTPS.put(identifier.toLowerCase(), resetOtp);
            }
        } else {
            PASSWORD_RESET_OTPS.put(identifier.toLowerCase(), resetOtp);
        }

        User user = userResult.get();
        boolean sentByEmail = false;
        if (user.getEmail() != null && !user.getEmail().isBlank() && emailService.isConfigured()) {
            try {
                emailService.sendPasswordResetOtp(user.getEmail(), user.getUsername(), otp, OTP_EXPIRY_MINUTES);
                sentByEmail = true;
            } catch (RestClientResponseException brevoError) {
                removeOtp(identifier.toLowerCase());
                String brevoBody = brevoError.getResponseBodyAsString();
                String brevoMessage = brevoBody == null || brevoBody.isBlank()
                    ? "No response body from Brevo"
                    : brevoBody;
                System.out.println("Brevo OTP email failed. Status: " + brevoError.getStatusCode()
                    + ", Response: " + brevoMessage);
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body("Brevo rejected OTP email. Status: " + brevoError.getStatusCode()
                        + ". Response: " + brevoMessage);
            } catch (RestClientException | IllegalStateException emailError) {
                removeOtp(identifier.toLowerCase());
                System.out.println("OTP email failed: " + emailError.getMessage());
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body("Unable to send OTP email. Check Brevo API key, sender verification, and Brevo account status.");
            }
        } else {
            System.out.println("Password reset OTP for " + identifier + ": " + otp + " (expires in " + OTP_EXPIRY_MINUTES + " minutes)");
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", sentByEmail
            ? "OTP sent to your registered email address."
            : "OTP generated. Email is not configured, so check backend logs.");
        response.put("expiresInMinutes", OTP_EXPIRY_MINUTES);
        if (exposeOtp && !sentByEmail) {
            response.put("otpForTesting", otp);
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/forgot-password/verify-otp")
    public ResponseEntity<?> verifyPasswordResetOtp(@RequestBody Map<String, String> data) {
        String identifier = normalize(data.get("identifier"));
        String otp = normalize(data.get("otp"));
        String newPassword = data.get("newPassword");

        if (identifier == null || otp == null || newPassword == null || newPassword.trim().length() < 6) {
            return ResponseEntity.badRequest().body("Enter identifier, OTP, and a password with at least 6 characters.");
        }

        PasswordResetOtp resetOtp = null;
        if (redisTemplate.isPresent()) {
            try {
                String json = redisTemplate.get().opsForValue().get("otp:" + identifier.toLowerCase());
                if (json != null) {
                    resetOtp = objectMapper.readValue(json, PasswordResetOtp.class);
                }
            } catch (Exception e) {
                resetOtp = PASSWORD_RESET_OTPS.get(identifier.toLowerCase());
            }
        } else {
            resetOtp = PASSWORD_RESET_OTPS.get(identifier.toLowerCase());
        }

        if (resetOtp == null) {
            return ResponseEntity.badRequest().body("Request a new OTP before resetting your password.");
        }

        if (LocalDateTime.now().isAfter(resetOtp.expiresAt())) {
            removeOtp(identifier.toLowerCase());
            return ResponseEntity.badRequest().body("OTP expired. Please request a new OTP.");
        }

        if (!resetOtp.otp().equals(otp)) {
            return ResponseEntity.badRequest().body("Invalid OTP.");
        }

        Optional<User> userResult = userRepository.findById(resetOtp.userId());
        if (userResult.isEmpty()) {
            removeOtp(identifier.toLowerCase());
            return ResponseEntity.badRequest().body("Account not found.");
        }

        User user = userResult.get();
        user.setPassword(passwordEncoder.encode(newPassword.trim()));
        userRepository.save(user);
        removeOtp(identifier.toLowerCase());

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Password reset successfully. You can login now.");
        return ResponseEntity.ok(response);
    }

    private void removeOtp(String identifier) {
        if (redisTemplate.isPresent()) {
            try {
                redisTemplate.get().delete("otp:" + identifier);
            } catch (Exception ignored) {}
        }
        PASSWORD_RESET_OTPS.remove(identifier);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword() {
        return ResponseEntity.badRequest().body("Direct password reset is disabled. Request and verify OTP first.");
    }

    private String normalize(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }

    private record PasswordResetOtp(Long userId, String otp, LocalDateTime expiresAt) {}
}
