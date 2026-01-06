let expenseChart = null;

document.addEventListener('DOMContentLoaded', function() {
    loadData();
    setupForms();
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
        type: 'pie',
        data: {
            labels: categories,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, categories.length),
                hoverBackgroundColor: colors.slice(0, categories.length).map(color => color + '80')
            }]
        },
        options: {
            responsive: true,
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
