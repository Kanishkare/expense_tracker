let chart = null;

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
    const res = await fetch('/api/expenses/summary', { headers: getHeaders() });
    if (res.status === 401) logout();
    const data = await res.json();
    updateChart(data);

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

async function updateChart(data) {
    const ctx = document.getElementById('expenseChart').getContext('2d');

    // Fetch category budgets
    const budgetRes = await fetch('/api/budget/categories', { headers: getHeaders() });
    const budgets = await budgetRes.json();

    const labels = [];
    const spentData = [];
    const leftoverData = [];
    const colors = [];

    const categoryColors = {
        'FOOD': '#4f46e5',
        'ENTERTAINMENT': '#10b981',
        'TRAVEL': '#f59e0b',
        'SHOPPING': '#ef4444',
        'OTHER': '#6366f1'
    };

    Object.keys(data).forEach(category => {
        const spent = data[category];
        const budget = budgets[category] || 0;
        const leftover = Math.max(0, budget - spent);

        if (spent > 0) {
            labels.push(`${category} Spent`);
            spentData.push(spent);
            colors.push(categoryColors[category] || '#6366f1');
        }

        if (leftover > 0) {
            labels.push(`${category} Leftover`);
            leftoverData.push(leftover);
            colors.push(categoryColors[category] + '80'); // Add transparency for leftover
        }
    });

    if (chart) chart.destroy();

    if (labels.length === 0) return;

    chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: [...spentData, ...leftoverData],
                backgroundColor: colors
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

async function addExpense() {
    const amount = document.getElementById('amount').value;
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;
    const description = document.getElementById('desc').value;

    if (!amount || !date) return alert('Please fill in amount and date');

    const expense = { amount, category, date, description };

    await fetch('/api/expenses', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(expense)
    });

    document.getElementById('amount').value = '';
    document.getElementById('desc').value = '';

    // Check if expense exceeds budget after adding
    const res = await fetch('/api/expenses/summary', { headers: getHeaders() });
    const data = await res.json();
    const total = data.totalSpent || 0;
    const budgetExceeded = data.budgetExceeded;

    if (budgetExceeded) {
        alert(`⚠️ Budget Exceeded! You have spent $${total.toFixed(2)} out of your $${data.monthlyLimit} monthly limit.`);
    }

    loadData();
}

async function loadData() {
    const res = await fetch('/api/expenses', { headers: getHeaders() });
    const expenses = await res.json();
    const tbody = document.querySelector('#expenseTable tbody');

    tbody.innerHTML = expenses.sort((a,b) => new Date(b.date) - new Date(a.date)).map(e => `
        <tr>
            <td>${e.date}</td>
            <td>${e.category}</td>
            <td>$${e.amount}</td>
            <td><button class="delete-btn" onclick="deleteExpense(${e.id})">Delete</button></td>
        </tr>
    `).join('');

    fetchSummary();
    loadBudget();
}

async function deleteExpense(id) {
    if (!confirm('Are you sure?')) return;
    await fetch('/api/expenses/' + id, {
        method: 'DELETE',
        headers: getHeaders()
    });
    loadData();
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
}

async function loadBudget() {
    const res = await fetch('/api/budget', { headers: getHeaders() });
    const budget = await res.json();

    document.getElementById('monthlyLimit').value = budget.monthlyLimit || 0;
    document.getElementById('displayLimit').innerText = budget.monthlyLimit || 0;
}

async function loadCategoryBudgets() {
    const res = await fetch('/api/budget/categories', { headers: getHeaders() });
    const budgets = await res.json();

    document.getElementById('foodBudget').value = budgets.FOOD || 0;
    document.getElementById('entertainmentBudget').value = budgets.ENTERTAINMENT || 0;
    document.getElementById('travelBudget').value = budgets.TRAVEL || 0;
    document.getElementById('shoppingBudget').value = budgets.SHOPPING || 0;
    document.getElementById('otherBudget').value = budgets.OTHER || 0;
}

async function updateCategoryBudgets() {
    const budgets = {
        FOOD: parseFloat(document.getElementById('foodBudget').value) || 0,
        ENTERTAINMENT: parseFloat(document.getElementById('entertainmentBudget').value) || 0,
        TRAVEL: parseFloat(document.getElementById('travelBudget').value) || 0,
        SHOPPING: parseFloat(document.getElementById('shoppingBudget').value) || 0,
        OTHER: parseFloat(document.getElementById('otherBudget').value) || 0
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
}

// Initial Load
document.getElementById('date').valueAsDate = new Date();
loadData();
