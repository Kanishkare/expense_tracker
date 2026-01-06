package com.tracker.controller;

import com.tracker.model.Budget;
import com.tracker.model.Category;
import com.tracker.model.Expense;
import com.tracker.model.User;
import com.tracker.repository.BudgetRepository;
import com.tracker.repository.ExpenseRepository;
import com.tracker.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {
    @Autowired ExpenseRepository expenseRepo;
    @Autowired UserRepository userRepo;
    @Autowired BudgetRepository budgetRepo;

    private User getAuthenticatedUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepo.findByUsername(username).orElseThrow();
    }

    @GetMapping
    public List<Expense> getExpenses() {
        return expenseRepo.findByUser(getAuthenticatedUser());
    }

    @PostMapping
    public Expense addExpense(@RequestBody Expense expense) {
        expense.setUser(getAuthenticatedUser());
        return expenseRepo.save(expense);
    }

    @DeleteMapping("/{id}")
    public void deleteExpense(@PathVariable Long id) {
        Expense expense = expenseRepo.findById(id).orElseThrow();
        if (expense.getUser().getId().equals(getAuthenticatedUser().getId())) {
            expenseRepo.delete(expense);
        }
    }

    @GetMapping("/summary")
    public Map<String, Object> getSummary() {
        User user = getAuthenticatedUser();
        LocalDate now = LocalDate.now();
        LocalDate startOfMonth = now.withDayOfMonth(1);
        LocalDate endOfMonth = now.withDayOfMonth(now.lengthOfMonth());
        List<Expense> expenses = expenseRepo.findByUserAndDateBetween(user, startOfMonth, endOfMonth);
        Optional<Budget> budgetOpt = budgetRepo.findByUser(user);
        Map<String, Object> summary = new HashMap<>();

        Map<String, Double> categoryTotals = new HashMap<>();
        double totalSpent = 0.0;
        for (Expense e : expenses) {
            categoryTotals.put(e.getCategory().name(), categoryTotals.getOrDefault(e.getCategory().name(), 0.0) + e.getAmount());
            totalSpent += e.getAmount();
        }

        for (Category cat : Category.values()) {
            String catName = cat.name();
            Double spent = categoryTotals.getOrDefault(catName, 0.0);
            Double limit = budgetOpt.map(b -> b.getCategoryLimits().getOrDefault(cat.name(), 0.0)).orElse(0.0);
            Double usagePercent = limit > 0 ? (spent / limit) * 100 : 0.0;

            Map<String, Double> catData = new HashMap<>();
            catData.put("spent", spent);
            catData.put("limit", limit);
            catData.put("usagePercent", usagePercent);
            summary.put(catName, catData);
        }

        // Add total spent and budget exceedance flag
        summary.put("totalSpent", totalSpent);
        if (budgetOpt.isPresent() && budgetOpt.get().getMonthlyLimit() > 0) {
            summary.put("monthlyLimit", budgetOpt.get().getMonthlyLimit());
            summary.put("budgetExceeded", totalSpent > budgetOpt.get().getMonthlyLimit());
        } else {
            summary.put("monthlyLimit", 0.0);
            summary.put("budgetExceeded", false);
        }

        return summary;
    }
}
