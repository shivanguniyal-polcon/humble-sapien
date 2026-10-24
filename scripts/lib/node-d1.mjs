// Local D1 and R2 stand-ins.
//
// D1 is SQLite, and Node 22 ships SQLite. This adapter gives the fetcher the
// three calls it uses — prepare/bind/first/run/all — with the same result
// shapes as D1, so the same store code runs in a test, in the local runner
// and in the Worker. It is deliberately not a general SQL layer.

import { DatabaseSync } from 'node:sqlite';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

class Bound {
  constructor(statement, args) {
    this.statement = statement;
    this.args = args;
  }

  async first() {
    return this.statement.get(...this.args) ?? null;
  }

  async all() {
    return { results: this.statement.all(...this.args) };
  }

  async run() {
    const info = this.statement.run(...this.args);
    return { meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) } };
  }
}

class Statement {
  constructor(statement) {
    this.statement = statement;
  }

  bind(...args) {
    return new Bound(this.statement, args);
  }

  async first() {
    return new Bound(this.statement, []).first();
  }

  async all() {
    return new Bound(this.statement, []).all();
  }

  async run() {
    return new Bound(this.statement, []).run();
  }
}

export class NodeD1 {
  constructor(path = ':memory:') {
    this.raw = new DatabaseSync(path);
  }

  prepare(sql) {
    return new Statement(this.raw.prepare(sql));
  }

  async exec(sql) {
    this.raw.exec(sql);
  }

  close() {
    this.raw.close();
  }
}

export class DiskBucket {
  constructor(directory) {
    this.directory = resolve(directory);
  }

  fileFor(key) {
    const path = resolve(join(this.directory, key));
    if (!path.startsWith(`${this.directory}/`)) throw new Error('bucket key escapes the directory');
    return path;
  }

  async put(key, bytes) {
    const path = this.fileFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, Buffer.from(bytes));
    return { key };
  }

  async get(key) {
    try {
      const buffer = await readFile(this.fileFor(key));
      return {
        arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      };
    } catch {
      return null;
    }
  }

  async delete(key) {
    try {
      await unlink(this.fileFor(key));
    } catch {
      // A missing object is already deleted.
    }
  }
}

export class MemoryBucket {
  constructor() {
    this.objects = new Map();
  }

  async put(key, bytes) {
    this.objects.set(key, Uint8Array.from(bytes));
    return { key };
  }

  async get(key) {
    const value = this.objects.get(key);
    if (!value) return null;
    return { arrayBuffer: async () => value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) };
  }

  async delete(key) {
    this.objects.delete(key);
  }
}
