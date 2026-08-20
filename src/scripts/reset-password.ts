import { AppDataSource } from '../config/data-source';
import { User } from '../entities/User';
import * as bcrypt from 'bcrypt';

async function resetPassword(email: string, newPassword: string) {
  await AppDataSource.initialize();
  try {
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: { email } });
    if (!user) {
      console.error(JSON.stringify({ success: false, message: 'User not found', email }));
      process.exit(1);
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await repo.save(user);

    console.log(JSON.stringify({ success: true, message: 'Password updated', email }));
  } catch (err) {
    console.error('Error resetting password:', err);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error('Usage: ts-node src/scripts/reset-password.ts <email> <newPassword>');
  process.exit(1);
}

resetPassword(email, newPassword).catch((e) => {
  console.error(e);
  process.exit(1);
});
