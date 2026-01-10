package com.tracker.controller;

import com.tracker.model.Income;
import com.tracker.model.User;
import com.tracker.repository.IncomeRepository;
import com.tracker.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/incomes")
public class IncomeController {
    @Autowired
    IncomeRepository incomeRepo;
    @Autowired
    UserRepository userRepo;
    @Autowired
    PasswordEncoder encoder;

    private User getAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            // For testing purposes, create or return a default user
            return userRepo.findByUsername("testuser").orElseGet(() -> {
                User defaultUser = new User();
                defaultUser.setUsername("testuser");
                defaultUser.setPassword(encoder.encode("password"));
                return userRepo.save(defaultUser);
            });
        }
        String username = auth.getName();
        return userRepo.findByUsername(username).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping
    public List<Income> getIncomes() {
        return incomeRepo.findByUser(getAuthenticatedUser());
    }

    @PostMapping
    public Income addIncome(@RequestBody Income income) {
        income.setUser(getAuthenticatedUser());
        return incomeRepo.save(income);
    }

    @DeleteMapping("/{id}")
    public void deleteIncome(@PathVariable Long id) {
        Income income = incomeRepo.findById(id).orElseThrow();
        if (income.getUser().getId().equals(getAuthenticatedUser().getId())) {
            incomeRepo.delete(income);
        }
    }
}
