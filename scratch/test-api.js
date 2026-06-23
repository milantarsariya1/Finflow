const PORT = 5000;
const email = `test-api-${Date.now()}@example.com`;
const password = 'Password123';
const name = 'API Tester';

async function run() {
  try {
    // 1. Signup
    console.log('--- Registering user...');
    let res = await fetch(`http://localhost:${PORT}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    
    let data = await res.json();
    if (!res.ok) {
      throw new Error(`Signup failed: ${data.message}`);
    }
    const token = data.token;
    console.log('Signup success. Token received.');

    // 2. Onboard
    console.log('--- Onboarding user...');
    res = await fetch(`http://localhost:${PORT}/api/user/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        monthlyIncome: 100000,
        bankBalance: 200000,
        savings: 50000,
        fixedExpenses: [{ name: 'Rent', amount: 20000 }]
      })
    });
    data = await res.json();
    if (!res.ok) {
      throw new Error(`Onboarding failed: ${data.message}`);
    }
    console.log('Onboarding success.');

    // 3. Add Transaction
    console.log('--- Adding transaction...');
    res = await fetch(`http://localhost:${PORT}/api/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        type: 'expense',
        amount: 1000,
        category: 'Food',
        note: 'Business lunch',
        date: new Date().toISOString()
      })
    });
    data = await res.json();
    if (!res.ok) {
      throw new Error(`Add transaction failed: ${data.message}`);
    }
    const txId = data.transaction.id;
    console.log('Created transaction ID:', txId);

    // 4. Update Transaction
    console.log('--- Updating transaction...');
    res = await fetch(`http://localhost:${PORT}/api/transactions/${txId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        type: 'expense',
        amount: 1500,
        category: 'Food',
        note: 'Business lunch updated',
        date: new Date().toISOString()
      })
    });
    data = await res.json();
    if (!res.ok) {
      throw new Error(`Update transaction failed: ${data.message}`);
    }
    console.log('Update transaction success. New amount:', data.transaction.amount);

    // 5. Delete Transaction
    console.log('--- Deleting transaction...');
    res = await fetch(`http://localhost:${PORT}/api/transactions/${txId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    data = await res.json();
    if (!res.ok) {
      throw new Error(`Delete transaction failed: ${data.message}`);
    }
    console.log('Delete transaction success. Final balance:', data.bankBalance);

    // 6. Update Profile
    console.log('--- Updating profile...');
    res = await fetch(`http://localhost:${PORT}/api/user/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Tester Updated',
        monthlyIncome: 110000,
        fixedExpenses: [{ name: 'Rent', amount: 22000 }, { name: 'WiFi', amount: 1500 }]
      })
    });
    data = await res.json();
    if (!res.ok) {
      throw new Error(`Update profile failed: ${data.message}`);
    }
    console.log('Update profile success. User name:', data.user.name);

    console.log('--- All API tests completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('API test failed:', error);
    process.exit(1);
  }
}

run();
