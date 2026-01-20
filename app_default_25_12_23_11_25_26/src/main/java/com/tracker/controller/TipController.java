package com.tracker.controller;

import com.tracker.model.User;
import com.tracker.service.AiTipService;
import com.tracker.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tips")
public class TipController {

    @Autowired
    private AiTipService aiTipService;

    @Autowired
    private UserRepository userRepo;

    private User getAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            // For testing purposes, create or return a default user
            return userRepo.findByUsername("testuser").orElseGet(() -> {
                User defaultUser = new User();
                defaultUser.setUsername("testuser");
                defaultUser.setPassword("password");
                return userRepo.save(defaultUser);
            });
        }
        String username = auth.getName();
        return userRepo.findByUsername(username).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping
    public ResponseEntity<List<String>> getTips() {
        User user = getAuthenticatedUser();
        List<String> tips = aiTipService.generateTips(user);
        return ResponseEntity.ok(tips);
    }
}
