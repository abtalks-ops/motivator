import Dexie, { type EntityTable } from 'dexie';
import type { ChatRecord, MoodEntry, Profile, Setting } from './types';

export const DB_NAME = 'motivator';

export class MotivatorDB extends Dexie {
  profile!: EntityTable<Profile, 'id'>;
  moods!: EntityTable<MoodEntry, 'id'>;
  settings!: EntityTable<Setting, 'key'>;
  messages!: EntityTable<ChatRecord, 'id'>;

  constructor(name = DB_NAME) {
    super(name);
    // Bump the version and add an upgrade when changing the schema. Never edit old versions.
    this.version(1).stores({
      profile: 'id',
      moods: '++id, day, createdAt',
      settings: 'key',
    });
    this.version(2).stores({
      messages: '++id, createdAt',
    });
  }
}

export const db = new MotivatorDB();
