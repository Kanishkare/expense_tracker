// Set Chart.js defaults for responsive behavior
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.plugins.legend.position = 'bottom';

let expenseChart = null;
let monthlyChart = null;
let categoryChart = null;
let incomeExpenseChart = null;

document.addEventListener('DOMContentLoaded', function() {
    loadData();
    setupForms();
    setupNewCharts();
});

async function loadData() {
    try {
        const [expensesResponse, budgetResponse] = await Promise.all([
            fetch('/api/expenses/summary'),
            fetch('/api/budgets')
        ]);

        const expenses = await expensesResponse.json();
        const budgets = await budgetResponse.json();

        renderChart(expenses, budgets);
        updateBudgetStatus(expenses, budgets);
        updateRemainingBudget(expenses, budgets);
        populateCategoryLimits(budgets);
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function renderChart(expenses, budgets) {
    const ctx = document.getElementById('expenseChart').getContext('2d');

    if (expenseChart) {
        expenseChart.destroy();
    }

    const categories = Object.keys(expenses);
    const data = categories.map(cat => expenses[cat]);
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];

    expenseChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, categories.length),
                hoverBackgroundColor: colors.slice(0, categories.length).map(color => color + '80')
            }]
        },
        options: {
            responsive: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': $' + context.parsed.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

function updateBudgetStatus(expenses, budgets) {
    const statusDiv = document.getElementById('budgetStatus');
    statusDiv.innerHTML = '';

    Object.keys(expenses).forEach(category => {
        const spent = expenses[category];
        const limit = budgets.categoryLimits ? budgets.categoryLimits[category] : 0;
        const usagePercent = limit > 0 ? (spent / limit) * 100 : 0;

        let status = 'On track';
        let statusClass = 'on-track';

        if (usagePercent >= 100) {
            status = 'Exceeded';
            statusClass = 'exceeded';
        } else if (usagePercent >= 80) {
            status = 'Warning';
            statusClass = 'warning';
        } else if (usagePercent >= 50) {
            status = '50% used';
            statusClass = 'half-used';
        }

        const statusElement = document.createElement('div');
        statusElement.className = `budget-status ${statusClass}`;
        statusElement.innerHTML = `
            <strong>${category}:</strong> $${spent.toFixed(2)} / $${limit.toFixed(2)} (${usagePercent.toFixed(1)}%) - ${status}
        `;
        statusDiv.appendChild(statusElement);
    });
}

function updateRemainingBudget(expenses, budgets) {
    const totalSpent = Object.values(expenses).reduce((sum, amount) => sum + amount, 0);
    const totalLimit = budgets.monthlyLimit || 0;
    const remaining = totalLimit - totalSpent;

    const remainingDiv = document.getElementById('remainingBudget');
    remainingDiv.innerHTML = `
        <h3>Remaining Budget: $${remaining.toFixed(2)}</h3>
    `;
}

function populateCategoryLimits(budgets) {
    const categoryLimitsDiv = document.getElementById('categoryLimits');
    categoryLimitsDiv.innerHTML = '';

    const categories = ['FOOD', 'ENTERTAINMENT', 'TRAVEL', 'SHOPPING', 'OTHER'];

    categories.forEach(category => {
        const limit = budgets.categoryLimits ? budgets.categoryLimits[category] || 0 : 0;
        const input = document.createElement('div');
        input.innerHTML = `
            <label for="${category}Limit">${category}:</label>
            <input type="number" id="${category}Limit" value="${limit}" step="0.01" required>
        `;
        categoryLimitsDiv.appendChild(input);
    });
}

function setupForms() {
    document.getElementById('totalBudgetForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const totalLimit = parseFloat(document.getElementById('totalLimit').value);

        try {
            await fetch('/api/budgets', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ monthlyLimit: totalLimit })
            });
            loadData();
        } catch (error) {
            console.error('Error updating total budget:', error);
        }
    });

    document.getElementById('categoryBudgetForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const categoryLimits = {};
        const categories = ['FOOD', 'ENTERTAINMENT', 'TRAVEL', 'SHOPPING', 'OTHER'];

        categories.forEach(category => {
            const value = parseFloat(document.getElementById(`${category}Limit`).value);
            if (value > 0) {
                categoryLimits[category] = value;
            }
        });

        try {
            await fetch('/api/budgets/categories', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(categoryLimits)
            });
            loadData();
        } catch (error) {
            console.error('Error updating category limits:', error);
        }
    });
}

function setupNewCharts() {
    // Monthly Spending Chart
    document.getElementById('monthlyYear').addEventListener('change', renderMonthlyChart);

    // Category Spending Chart
    document.getElementById('categoryYear').addEventListener('change', renderCategoryChart);
    document.getElementById('categoryMonth').addEventListener('change', renderCategoryChart);

    // Income vs Expense Chart
    document.getElementById('incomeExpenseYear').addEventListener('change', renderIncomeExpenseChart);
    document.getElementById('incomeExpenseMonth').addEventListener('change', renderIncomeExpenseChart);

    // Initial render
    renderMonthlyChart();
    renderCategoryChart();
    renderIncomeExpenseChart();
}

async function renderMonthlyChart() {
    const year = document.getElementById('monthlyYear').value;
    try {
        const response = await fetch(`/api/expenses/trends/${year}`);
        const data = await response.json();

        const ctx = document.getElementById('monthlyChart').getContext('2d');

        if (monthlyChart) {
            monthlyChart.destroy();
        }

        monthlyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.months,
                datasets: [{
                    label: 'Monthly Expenses',
                    data: data.expenses,
                    borderColor: '#36A2EB',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Expenses: $' + context.parsed.y.toFixed(2);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error rendering monthly chart:', error);
    }
}

async function renderCategoryChart() {
    const year = document.getElementById('categoryYear').value;
    const month = document.getElementById('categoryMonth').value;
    try {
        const response = await fetch(`/api/expenses/category-spending?year=${year}&month=${month}`);
        const data = await response.json();

        const ctx = document.getElementById('categoryChart').getContext('2d');

        if (categoryChart) {
            categoryChart.destroy();
        }

        const categories = Object.keys(data);
        const values = Object.values(data);
        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];

        categoryChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: categories,
                datasets: [{
                    data: values,
                    backgroundColor: colors.slice(0, categories.length),
                    hoverBackgroundColor: colors.slice(0, categories.length).map(color => color + '80')
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': $' + context.parsed.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error rendering category chart:', error);
    }
}

async function renderIncomeExpenseChart() {
    const year = document.getElementById('incomeExpenseYear').value;
    const month = document.getElementById('incomeExpenseMonth').value;
    try {
        const response = await fetch(`/api/expenses/income-vs-expense?year=${year}&month=${month}`);
        const data = await response.json();

        const ctx = document.getElementById('incomeExpenseChart').getContext('2d');

        if (incomeExpenseChart) {
            incomeExpenseChart.destroy();
        }

        incomeExpenseChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Income', 'Expenses'],
                datasets: [{
                    label: 'Amount',
                    data: [data.income || 0, data.expenses || 0],
                    backgroundColor: ['#4BC0C0', '#FF6384'],
                    hoverBackgroundColor: ['#4BC0C080', '#FF638480']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': $' + context.parsed.y.toFixed(2);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error rendering income vs expense chart:', error);
    }
}
