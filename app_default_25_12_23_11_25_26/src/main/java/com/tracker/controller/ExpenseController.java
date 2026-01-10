package com.tracker.controller;

import com.tracker.model.Expense;
import com.tracker.model.User;
import com.tracker.model.Income;
import com.tracker.model.Budget;
import com.tracker.repository.ExpenseRepository;
import com.tracker.repository.IncomeRepository;
import com.tracker.repository.BudgetRepository;
import com.tracker.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

    @Autowired
    private ExpenseRepository expenseRepo;

    @Autowired
    private IncomeRepository incomeRepo;

    @Autowired
    private BudgetRepository budgetRepo;

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private PasswordEncoder encoder;

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
    public List<Expense> getExpenses() {
        User user = getAuthenticatedUser();
        return expenseRepo.findByUserOrderByDateDesc(user);
    }

    @PostMapping
    public Expense addExpense(@RequestBody Expense expense) {
        User user = getAuthenticatedUser();
        expense.setUser(user);
        return expenseRepo.save(expense);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Expense> updateExpense(@PathVariable Long id, @RequestBody Expense updatedExpense) {
        User user = getAuthenticatedUser();
        Expense expense = expenseRepo.findById(id).orElse(null);
        if (expense != null && expense.getUser().getId().equals(user.getId())) {
            expense.setAmount(updatedExpense.getAmount());
            expense.setCategory(updatedExpense.getCategory());
            expense.setDate(updatedExpense.getDate());
            expense.setDescription(updatedExpense.getDescription());
            Expense saved = expenseRepo.save(expense);
            return ResponseEntity.ok(saved);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteExpense(@PathVariable Long id) {
        User user = getAuthenticatedUser();
        Expense expense = expenseRepo.findById(id).orElse(null);
        if (expense != null && expense.getUser().getId().equals(user.getId())) {
            expenseRepo.delete(expense);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/summary")
    public Map<String, Object> getSummary(@RequestParam(required = false) Integer year, @RequestParam(required = false) Integer month) {
        User user = getAuthenticatedUser();
        List<Expense> expenses;
        if (year != null && month != null) {
            LocalDate start = LocalDate.of(year, month, 1);
            LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
            expenses = expenseRepo.findByUserAndDateBetween(user, start, end);
        } else {
            expenses = expenseRepo.findByUser(user);
        }
        Map<String, Object> summary = new HashMap<>();
        Map<String, Double> categorySums = new HashMap<>();
        double total = 0;
        for (Expense e : expenses) {
            categorySums.put(e.getCategory().name(), categorySums.getOrDefault(e.getCategory().name(), 0.0) + e.getAmount());
            total += e.getAmount();
        }
        summary.putAll(categorySums);
        summary.put("totalSpent", total);

        // Check budget exceeded
        Budget budget = budgetRepo.findByUser(user).orElse(null);
        boolean budgetExceeded = false;
        if (budget != null && budget.getMonthlyLimit() != null && total > budget.getMonthlyLimit()) {
            budgetExceeded = true;
        }
        summary.put("budgetExceeded", budgetExceeded);

        return summary;
    }

    @GetMapping("/trends/{year}")
    public Map<String, Object> getMonthlyTrends(@PathVariable int year) {
        User user = getAuthenticatedUser();
        Map<String, Object> trends = new HashMap<>();
        List<Double> monthlyExpenses = new ArrayList<>();
        List<Double> monthlyIncomes = new ArrayList<>();
        List<String> months = new ArrayList<>();

        for (int month = 1; month <= 12; month++) {
            LocalDate start = LocalDate.of(year, month, 1);
            LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
            List<Expense> expenses = expenseRepo.findByUserAndDateBetween(user, start, end);
            List<Income> incomes = incomeRepo.findByUserAndDateBetween(user, start, end);

            double totalExpense = expenses.stream().mapToDouble(Expense::getAmount).sum();
            double totalIncome = incomes.stream().mapToDouble(Income::getAmount).sum();

            monthlyExpenses.add(totalExpense);
            monthlyIncomes.add(totalIncome);
            months.add(start.getMonth().name().substring(0, 3));
        }

        trends.put("months", months);
        trends.put("expenses", monthlyExpenses);
        trends.put("incomes", monthlyIncomes);
        return trends;
    }

    @GetMapping("/category-spending")
    public Map<String, Double> getCategorySpending(@RequestParam int year, @RequestParam int month) {
        User user = getAuthenticatedUser();
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
        List<Expense> expenses = expenseRepo.findByUserAndDateBetween(user, start, end);

        Map<String, Double> categorySpending = new HashMap<>();
        for (Expense e : expenses) {
            categorySpending.put(e.getCategory().name(), categorySpending.getOrDefault(e.getCategory().name(), 0.0) + e.getAmount());
        }
        return categorySpending;
    }

    @GetMapping("/income-vs-expense")
    public Map<String, Double> getIncomeVsExpense(@RequestParam int year, @RequestParam int month) {
        User user = getAuthenticatedUser();
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
        List<Expense> expenses = expenseRepo.findByUserAndDateBetween(user, start, end);
        List<Income> incomes = incomeRepo.findByUserAndDateBetween(user, start, end);

        double totalExpense = expenses.stream().mapToDouble(Expense::getAmount).sum();
        double totalIncome = incomes.stream().mapToDouble(Income::getAmount).sum();

        Map<String, Double> data = new HashMap<>();
        data.put("income", totalIncome);
        data.put("expense", totalExpense);
        return data;
    }
}
