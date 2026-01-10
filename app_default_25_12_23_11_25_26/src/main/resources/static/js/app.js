let chart = null;
let monthlySpendingChart = null;
let categoryChart = null;
let incomeExpenseChart = null;
let isEditing = false;
let editingId = null;

if (!localStorage.getItem('token')) {
    window.location.href = 'index.html';
}

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
    };
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

async function fetchSummary() {
    const month = document.getElementById('monthSelect').value;
    const year = document.getElementById('yearSelect').value;
    const res = await fetch(`/api/expenses/summary?year=${year}&month=${month}`, { headers: getHeaders() });
    if (res.status === 401) logout();
    const data = await res.json();

    const total = data.totalSpent || 0;
    document.getElementById('totalSpent').innerText = total.toFixed(2);
    checkBudget(total, data.budgetExceeded);
    loadCategoryBudgets();
}

async function checkBudget(total, budgetExceeded) {
    const res = await fetch('/api/budget', { headers: getHeaders() });
    const budget = await res.json();
    document.getElementById('displayLimit').innerText = budget.monthlyLimit || 0;

    const warning = document.getElementById('budget-warning');
    if (budgetExceeded) {
        warning.style.display = 'block';
    } else {
        warning.style.display = 'none';
    }
}

// Mock data for charts
const mockMonthlySpending = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    data: [8000, 7500, 9000, 8500, 9500]
};

const mockCategoryData = {
    labels: ['Food', 'Rent', 'Travel', 'Shopping', 'Utilities'],
    data: [35, 30, 15, 10, 10], // percentages
    colors: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#6366f1']
};

const mockIncomeExpense = {
    labels: ['Income', 'Expenses'],
    data: [15000, 12000]
};

function renderMonthlySpendingChart(data, selectedMonth) {
    const canvas = document.getElementById('monthlySpendingChart');
    const ctx = canvas.getContext('2d');
    if (monthlySpendingChart) monthlySpendingChart.destroy();

    // Reset canvas size to prevent size increase
    canvas.width = 300;
    canvas.height = 200;

    const labels = data.months || [];
    const expenses = data.expenses || [];
    const incomes = data.incomes || [];

    monthlySpendingChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Expenses',
                data: expenses,
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.1
            }, {
                label: 'Income',
                data: incomes,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Amount ($)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Months'
                    }
                }
            }
        }
    });
}

function renderCategoryChart(data) {
    const canvas = document.getElementById('categoryChart');
    const ctx = canvas.getContext('2d');
    if (categoryChart) categoryChart.destroy();

    // Reset canvas size to prevent size increase
    canvas.width = 300;
    canvas.height = 300;

    const labels = Object.keys(data);
    const values = Object.values(data);
    const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'];

    categoryChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, labels.length)
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
                            const label = context.label || '';
                            const value = context.parsed;
                            return `${label}: $${value.toFixed(2)}`;
                        }
                    }
                }
            }
        }
    });
}

function renderIncomeExpenseChart(data) {
    const canvas = document.getElementById('incomeExpenseChart');
    const ctx = canvas.getContext('2d');
    if (incomeExpenseChart) incomeExpenseChart.destroy();

    // Reset canvas size to prevent size increase
    canvas.width = 100;
    canvas.height = 100;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const labels = [];
    for (let i = 2; i >= 0; i--) {
        let m = currentMonth - i;
        let y = currentYear;
        if (m <= 0) {
            m += 12;
            y--;
        }
        const monthName = new Date(y, m - 1).toLocaleString('default', { month: 'short' });
        labels.push(`${monthName} ${y}`);
    }

    incomeExpenseChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Expenses',
                data: data,
                backgroundColor: '#ef4444'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 5000
                    },
                    title: {
                        display: true,
                        text: 'Amount ($)'
                    }
                }
            }
        }
    });
}

async function updateChart(data) {
    // This function is kept for backward compatibility but now renders the category chart
    renderCategoryChart();
}

async function addExpense() {
    const amount = document.getElementById('amount').value;
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;
    const description = document.getElementById('desc').value;

    if (!amount || !date) return alert('Please fill in amount and date');

    const expense = { amount, category, date, description };

    try {
        let res;
        if (isEditing) {
            res = await fetch('/api/expenses/' + editingId, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(expense)
            });
            if (res.ok) {
                cancelEdit();
            }
        } else {
            res = await fetch('/api/expenses', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(expense)
            });
            if (res.ok) {
                document.getElementById('amount').value = '';
                document.getElementById('desc').value = '';
            }
        }

        if (!res.ok) {
            if (res.status === 401) {
                logout();
                return;
            }
            throw new Error(`Failed to save expense: ${res.status} ${res.statusText}`);
        }

        // Check if expense exceeds budget after adding/updating
        const month = document.getElementById('monthSelect').value;
        const year = document.getElementById('yearSelect').value;
        const summaryRes = await fetch(`/api/expenses/summary?year=${year}&month=${month}`, { headers: getHeaders() });
        if (summaryRes.ok) {
            const data = await summaryRes.json();
            const total = data.totalSpent || 0;
            const budgetExceeded = data.budgetExceeded;

            if (budgetExceeded) {
                alert(`⚠️ Budget Exceeded! You have spent $${total.toFixed(2)} out of your monthly limit.`);
            }
        }

        loadData();
        updateCharts();
        loadBudgetSummary();
    } catch (error) {
        console.error('Error saving expense:', error);
        alert('Failed to save expense. Please check your connection and try again.');
    }
}

async function addIncome() {
    const amount = document.getElementById('incomeAmount').value;
    const date = document.getElementById('incomeDate').value;
    const description = document.getElementById('incomeDesc').value;

    if (!amount || !date) return alert('Please fill in amount and date');

    const income = { amount, date, description };

    await fetch('/api/incomes', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(income)
    });

    document.getElementById('incomeAmount').value = '';
    document.getElementById('incomeDesc').value = '';

    updateCharts();
}

function trackMyExpense() {
    updateCharts();
}

async function loadData() {
    try {
        const res = await fetch('/api/expenses', { headers: getHeaders() });
        if (!res.ok) {
            if (res.status === 401) {
                logout();
                return;
            }
            throw new Error(`Failed to load expenses: ${res.status} ${res.statusText}`);
        }
        const expenses = await res.json();
        const tbody = document.querySelector('#expenseTable tbody');

        tbody.innerHTML = expenses.sort((a,b) => new Date(b.date) - new Date(a.date)).map(e => `
            <tr>
                <td>${e.date}</td>
                <td>${e.category}</td>
                <td>$${e.amount}</td>
                <td>${e.description || ''}</td>
                <td>
                    <button class="edit-btn" onclick="editExpense(${e.id})">Edit</button>
                    <button class="delete-btn" onclick="deleteExpense(${e.id})">Delete</button>
                </td>
            </tr>
        `).join('');

        fetchSummary();
        loadBudget();
        loadBudgetSummary();
    } catch (error) {
        console.error('Error loading expenses:', error);
        alert('Failed to load expenses. Please check your connection and try again.');
    }
}

async function deleteExpense(id) {
    if (!confirm('Are you sure?')) return;
    try {
        const res = await fetch('/api/expenses/' + id, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) {
            if (res.status === 401) {
                logout();
                return;
            }
            throw new Error(`Failed to delete expense: ${res.status} ${res.statusText}`);
        }
        loadData();
        updateCharts();
    } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Failed to delete expense. Please check your connection and try again.');
    }
}

async function updateBudget() {
    const limit = document.getElementById('monthlyLimit').value;
    await fetch('/api/budget', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ monthlyLimit: limit })
    });

    // Calculate budget completion
    const res = await fetch('/api/expenses/summary', { headers: getHeaders() });
    const data = await res.json();
    const total = data.totalSpent || 0;
    const completion = limit > 0 ? ((total / limit) * 100).toFixed(1) : 0;

    alert(`✅ Monthly Budget Updated Successfully!\n\nCurrent Spending: $${total.toFixed(2)} / $${limit} (${completion}% complete)`);
    loadData();
    updateCharts();
}

async function loadBudget() {
    const res = await fetch('/api/budget', { headers: getHeaders() });
    const budget = await res.json();

    document.getElementById('monthlyLimit').value = budget.monthlyLimit || 0;
    document.getElementById('displayLimit').innerText = budget.monthlyLimit || 0;
}

async function loadBudgetSummary() {
    try {
        const month = document.getElementById('monthSelect').value;
        const year = document.getElementById('yearSelect').value;
        const res = await fetch('/api/budget', { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch budget');
        const budget = await res.json();
        const summaryRes = await fetch(`/api/expenses/summary?year=${year}&month=${month}`, { headers: getHeaders() });
        if (!summaryRes.ok) throw new Error('Failed to fetch summary');
        const summary = await summaryRes.json();

        const totalBudget = budget.monthlyLimit || 0;
        const spent = summary.totalSpent || 0;
        const remaining = totalBudget - spent;

        document.getElementById('totalBudget').innerText = '$' + totalBudget.toFixed(2);
        document.getElementById('budgetSpent').innerText = '$' + spent.toFixed(2);
        document.getElementById('remainingBudget').innerText = '$' + remaining.toFixed(2);

        // Show alerts
        const alertsDiv = document.getElementById('alerts');
        const monthlyAlert = document.getElementById('monthlyAlert');
        if (remaining < 0 && totalBudget > 0) {
            monthlyAlert.style.display = 'block';
            alertsDiv.style.display = 'block';
        } else {
            monthlyAlert.style.display = 'none';
        }

        // Category alerts
        const categoryAlerts = document.getElementById('categoryAlerts');
        categoryAlerts.innerHTML = '';
        const categoryBudgets = budget.categoryLimits || {};
        for (const [category, limit] of Object.entries(categoryBudgets)) {
            const spentCat = summary[category] || 0;
            if (spentCat > limit) {
                const alertDiv = document.createElement('div');
                alertDiv.className = 'alert warning';
                alertDiv.innerText = `${category} category budget exceeded!`;
                categoryAlerts.appendChild(alertDiv);
                alertsDiv.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error loading budget summary:', error);
        alert('Failed to load budget summary. Please check your connection and try again.');
    }
}

async function loadCategoryBudgets() {
    const res = await fetch('/api/budget/categories', { headers: getHeaders() });
    const budgets = await res.json();

    document.getElementById('foodBudget').value = budgets.FOOD || 0;
    document.getElementById('rentBudget').value = budgets.RENT || 0;
    document.getElementById('travelBudget').value = budgets.TRAVEL || 0;
    document.getElementById('shoppingBudget').value = budgets.SHOPPING || 0;
    document.getElementById('utilitiesBudget').value = budgets.UTILITIES || 0;
}

async function updateCategoryBudgets() {
    const budgets = {
        FOOD: parseFloat(document.getElementById('foodBudget').value) || 0,
        RENT: parseFloat(document.getElementById('rentBudget').value) || 0,
        TRAVEL: parseFloat(document.getElementById('travelBudget').value) || 0,
        SHOPPING: parseFloat(document.getElementById('shoppingBudget').value) || 0,
        UTILITIES: parseFloat(document.getElementById('utilitiesBudget').value) || 0
    };

    await fetch('/api/budget/categories', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(budgets)
    });

    // Calculate category budget completion
    const res = await fetch('/api/expenses/summary', { headers: getHeaders() });
    const data = await res.json();

    let message = '✅ Category Budgets Updated Successfully!\n\n';
    Object.keys(budgets).forEach(category => {
        const spent = data[category] || 0;
        const budget = budgets[category];
        const remaining = budget - spent;
        const completion = budget > 0 ? ((spent / budget) * 100).toFixed(1) : 0;
        message += `${category}: $${spent.toFixed(2)} / $${budget} (${completion}%)\n`;
    });

    alert(message);
    loadData();
    updateCharts();
}

// Initialize charts on load
document.addEventListener('DOMContentLoaded', function() {
    // Set current month and year as default
    const now = new Date();
    document.getElementById('monthSelect').value = now.getMonth() + 1;
    document.getElementById('yearSelect').value = now.getFullYear();

    updateCharts(); // Load charts with real data for current month/year
    loadCategoryBudgets(); // Load category budgets

    // Add event listeners for filters
    document.getElementById('monthSelect').addEventListener('change', updateCharts);
    document.getElementById('yearSelect').addEventListener('change', updateCharts);
});

async function updateCharts() {
    const month = document.getElementById('monthSelect').value;
    const year = document.getElementById('yearSelect').value;

    try {
        // Fetch data for Income vs Expenses chart (last 3 months)
        let incomeExpenseData = [];
        for (let i = 2; i >= 0; i--) {
            let m = parseInt(month) - i;
            let y = parseInt(year);
            if (m <= 0) {
                m += 12;
                y--;
            }
            const res = await fetch(`/api/expenses/income-vs-expense?year=${y}&month=${m}`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                incomeExpenseData.push(data.expense || 0);
            } else {
                incomeExpenseData.push(0);
            }
        }

        // Fetch data for Category chart
        const categoryRes = await fetch(`/api/expenses/category-spending?year=${year}&month=${month}`, { headers: getHeaders() });
        const categoryData = categoryRes.ok ? await categoryRes.json() : {};

        // Fetch data for Monthly Spending chart (trends)
        const trendsRes = await fetch(`/api/expenses/trends/${year}`, { headers: getHeaders() });
        const trendsData = trendsRes.ok ? await trendsRes.json() : { months: [], expenses: [], incomes: [] };

        // Update charts with real data (or empty data if API fails)
        renderIncomeExpenseChart(incomeExpenseData);
        renderCategoryChart(categoryData);
        renderMonthlySpendingChart(trendsData, month);

        // Update budget summary
        loadBudgetSummary();

    } catch (error) {
        console.error('Error updating charts:', error);
        // Render charts with empty data on error
        renderIncomeExpenseChart([0, 0, 0]);
        renderCategoryChart({});
        renderMonthlySpendingChart({ months: [], expenses: [], incomes: [] }, month);
    }
}

// Initial Load
document.getElementById('date').valueAsDate = new Date();
loadData();
