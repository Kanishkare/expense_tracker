package com.tracker.controller;

import com.tracker.model.Budget;
import com.tracker.model.Category;
import com.tracker.model.User;
import com.tracker.repository.BudgetRepository;
import com.tracker.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/budget")
public class BudgetController {
    @Autowired BudgetRepository budgetRepo;
    @Autowired UserRepository userRepo;

    private User getAuthenticatedUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepo.findByUsername(username).orElseThrow();
    }

    @GetMapping
    public Budget getBudget() {
        User user = getAuthenticatedUser();
        return budgetRepo.findByUser(user).orElseGet(() -> {
            Budget b = new Budget();
            b.setUser(user);
            return budgetRepo.save(b);
        });
    }

    @PostMapping
    public Budget updateBudget(@RequestBody Budget budgetData) {
        User user = getAuthenticatedUser();
        Budget budget = budgetRepo.findByUser(user).orElse(new Budget());
        budget.setUser(user);
        budget.setMonthlyLimit(budgetData.getMonthlyLimit());
        budget.setDailyLimit(budgetData.getDailyLimit());
        if (budgetData.getCategoryLimits() != null) {
            budget.setCategoryLimits(budgetData.getCategoryLimits());
        }
        return budgetRepo.save(budget);
    }

    @PostMapping("/category")
    public Budget updateCategoryLimits(@RequestBody Map<Category, Double> categoryLimits) {
        User user = getAuthenticatedUser();
        Budget budget = budgetRepo.findByUser(user).orElse(new Budget());
        budget.setUser(user);
        budget.setCategoryLimits(categoryLimits);
        return budgetRepo.save(budget);
    }
}
