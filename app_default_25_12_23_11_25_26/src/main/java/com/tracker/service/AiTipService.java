package com.tracker.service;

import com.tracker.model.User;
import com.tracker.model.Budget;
import com.tracker.repository.BudgetRepository;
import com.tracker.repository.ExpenseRepository;
import com.tracker.repository.IncomeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;

@Service
public class AiTipService {

    @Autowired
    private ExpenseRepository expenseRepo;

    @Autowired
    private IncomeRepository incomeRepo;

    @Autowired
    private BudgetRepository budgetRepo;

    public List<String> generateTips(User user) {
        List<String> tips = new ArrayList<>();

        // Get current month data
        LocalDate now = LocalDate.now();
        int currentMonth = now.getMonthValue();
        int currentYear = now.getYear();

        LocalDate start = LocalDate.of(currentYear, currentMonth, 1);
        LocalDate end = start.withDayOfMonth(start.lengthOfMonth());

        List<com.tracker.model.Expense> expenses = expenseRepo.findByUserAndDateBetween(user, start, end);
        List<com.tracker.model.Income> incomes = incomeRepo.findByUserAndDateBetween(user, start, end);

        double totalExpense = expenses.stream().mapToDouble(e -> e.getAmount()).sum();
        double totalIncome = incomes.stream().mapToDouble(i -> i.getAmount()).sum();

        // Budget check
        Budget budget = budgetRepo.findByUser(user).orElse(null);
        double monthlyLimit = budget != null && budget.getMonthlyLimit() != null ? budget.getMonthlyLimit() : 0;

        // Generate tips based on data
        if (totalExpense > totalIncome) {
            tips.add("💰 Your expenses exceed your income this month. Consider reviewing your spending habits.");
        }

        if (monthlyLimit > 0 && totalExpense > monthlyLimit) {
            tips.add("⚠️ You've exceeded your monthly budget. Try to cut back on non-essential expenses.");
        }

        if (totalIncome > 0 && totalExpense / totalIncome < 0.7) {
            tips.add("🎯 Great job! You're spending less than 70% of your income. Keep up the good work!");
        }

        // Category-specific tips
        Map<String, Double> categorySpending = new HashMap<>();
        for (com.tracker.model.Expense e : expenses) {
            categorySpending.put(e.getCategory().name(), categorySpending.getOrDefault(e.getCategory().name(), 0.0) + e.getAmount());
        }

        for (Map.Entry<String, Double> entry : categorySpending.entrySet()) {
            String category = entry.getKey();
            double spent = entry.getValue();
            if (spent > totalExpense * 0.3) {
                tips.add("📊 " + category + " expenses are high. Consider setting a category budget to control spending.");
            }
        }

        // Savings tip
        double savings = totalIncome - totalExpense;
        if (savings > 0) {
            tips.add("💸 You've saved $" + String.format("%.2f", savings) + " this month. Consider investing or building an emergency fund.");
        }

        // Default tips if no specific data
        if (tips.isEmpty()) {
            tips.add("📈 Track your expenses regularly to gain better insights into your spending patterns.");
            tips.add("🎯 Set realistic budgets for different categories to stay on top of your finances.");
        }

        return tips;
    }
}
