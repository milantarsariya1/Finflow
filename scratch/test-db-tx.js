import prisma from '../api/config/db.js';

async function run() {
  try {
    // 1. Find or create a user
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test-db@example.com',
          passwordHash: 'dummyhash',
        }
      });
    }

    console.log('User found/created:', user.id);

    // 2. Create a transaction
    const tx = await prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'expense',
        amount: 1000,
        category: 'Food',
        note: 'Initial lunch',
      }
    });
    console.log('Created transaction:', tx.id);

    // 3. Update the transaction
    const updated = await prisma.transaction.update({
      where: { id: tx.id },
      data: {
        amount: 1500,
        note: 'Updated lunch',
      }
    });
    console.log('Updated transaction:', updated.id, 'New amount:', updated.amount);

    // 4. Delete the transaction
    await prisma.transaction.delete({
      where: { id: tx.id }
    });
    console.log('Deleted transaction successfully!');

    process.exit(0);
  } catch (error) {
    console.error('Database operation failed:', error);
    process.exit(1);
  }
}

run();
