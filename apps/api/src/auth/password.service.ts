import { Injectable, type OnModuleInit } from '@nestjs/common';
import { type Algorithm, hash, verify } from '@node-rs/argon2';

// Algorithm is a const enum, which isolatedModules cannot inline.
const ARGON2ID = 2 as Algorithm.Argon2id;

// OWASP Password Storage Cheat Sheet, Argon2id minimum configuration.
const OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19_456, // KiB
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class PasswordService implements OnModuleInit {
  private dummyHash = '';

  async onModuleInit() {
    this.dummyHash = await hash('timing-equaliser', OPTIONS);
  }

  hash(password: string) {
    return hash(password, OPTIONS);
  }

  /**
   * Verifies against a dummy hash when there is no stored one, so a missing
   * account takes as long as a wrong password and cannot be detected.
   */
  async verify(storedHash: string | undefined, password: string) {
    const target = storedHash || this.dummyHash;
    const matches = await verify(target, password).catch(() => false);
    return matches && target !== this.dummyHash;
  }
}
