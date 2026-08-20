import { AppDataSource } from '../config/data-source';
import { User } from '../entities/User';

async function findUser(email: string) {
  await AppDataSource.initialize();
  try {
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: { email } });
    if (!user) {
      console.log(JSON.stringify({ found: false, email }));
    } else {
      const { password, refreshToken, ...safe } = user as any;
      console.log(JSON.stringify({ found: true, user: safe }, null, 2));
    }
  } catch (err) {
    console.error('Error querying user:', err);
  } finally {
    await AppDataSource.destroy();
  }
}

const email = process.argv[2] || 'yahia@gmail.com';
findUser(email).catch((e) => {
  console.error(e);
  process.exit(1);
});
