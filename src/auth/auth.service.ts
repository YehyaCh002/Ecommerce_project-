import { Repository } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { User } from '../entities/User';

interface GoogleProfile {
  id?: string;
  email?: string;
  name?: string;
  picture?: string;
}

export class AuthService {
  private readonly userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  async upsertGoogleUser(profile: GoogleProfile): Promise<User> {
    const repo = this.userRepository;
    const email = profile.email ?? '';

    // 1. Try find by oauthId + provider
    let user = await repo.findOne({
      where: { oauthProvider: 'google', oauthId: profile.id ?? '' },
    });

    if (user) {
      return user;
    }

    // 2. Try find by email (link accounts)
    if (email) {
      user = await repo.findOne({ where: { email } });
    }

    if (user) {
      // Link this Google account to the existing user
      user.oauthProvider = 'google';
      user.oauthId = profile.id ?? null;
      if (!user.avatar && profile.picture) {
        user.avatar = profile.picture;
      }
      return repo.save(user);
    }

    // 3. Create a brand-new user
    const created = repo.create({
      name: profile.name || email || 'Google User',
      email,
      password: null,
      role: 'customer',
      avatar: profile.picture ?? null,
      oauthProvider: 'google',
      oauthId: profile.id ?? null,
    });
    return repo.save(created);
  }
}
