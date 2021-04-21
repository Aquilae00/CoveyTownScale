import { CoveyTown, CoveyPlayer } from './DBTypes';
import IDBClient from './IDBClient';
import MongoDBClient from './MongoDBClient';
import RedisDBClient from './RedisClient';

export default class ClusterClient implements IDBClient {
  private _redisClientPromise: Promise<IDBClient>;

  private _mongoDBClientPromise: Promise<IDBClient>;

  private static _instance: ClusterClient | null;

  private _redisClient: IDBClient | null = null;

  private _mongoDBClient: IDBClient | null = null;

  private constructor() {
    this._redisClientPromise = RedisDBClient.setup();
    this._mongoDBClientPromise = MongoDBClient.setup();
  }

  private async setupRedis() {
    if (!this._redisClient) {
      this._redisClient = await this._redisClientPromise;
    }
    return this._redisClient;
  }

  private async setupMongo() {
    if (!this._mongoDBClient) {
      this._mongoDBClient = await this._mongoDBClientPromise;
    }
    return this._mongoDBClient;
  }

  static async getInstance(): Promise<ClusterClient> {
    let redis = null;
    let mongo = null;
    if (!ClusterClient._instance) {
      ClusterClient._instance = new ClusterClient();
    }

    try {
      redis = await ClusterClient._instance.setupRedis();
      mongo = await ClusterClient._instance.setupMongo();
      if (!redis || !mongo) {
        ClusterClient._instance = null;
      }
    } catch (err) {
      ClusterClient._instance = null;
    }

    if (!ClusterClient._instance) {
      throw new Error('Failed to setup ClusterClient instance');
    }

    return ClusterClient._instance;
  }

  async saveTown(coveyTown: CoveyTown): Promise<void> {
    if (!this._mongoDBClient || !this._redisClient) {
      throw new Error('database clients not setup');
    }

    await this._mongoDBClient.saveTown(coveyTown);
    await this._redisClient.saveTown(coveyTown);
  }

  async getTown(coveyTownID: string): Promise<CoveyTown | null> {
    if (!this._mongoDBClient || !this._redisClient) {
      throw new Error('database clients not setup');
    }
    const redis = await this._redisClient.getTown(coveyTownID);
    if (redis) {
      return redis;
    }
    const mongo = await this._mongoDBClient.getTown(coveyTownID);
    return mongo;
  }

  async getTowns(): Promise<CoveyTown[]> {
    if (!this._mongoDBClient || !this._redisClient) {
      throw new Error('database clients not setup');
    }
    const redis = await this._redisClient.getTowns();
    if (redis) {
      return redis;
    }
    const mongo = await this._mongoDBClient.getTowns();
    return mongo;
  }

  async deleteTown(coveyTownID: string): Promise<void> {
    if (!this._mongoDBClient || !this._redisClient) {
      throw new Error('database clients not setup');
    }
    await this._mongoDBClient.deleteTown(coveyTownID);
    await this._redisClient.deleteTown(coveyTownID);
  }

  async addPlayerToTown(playerID: string, coveyTownID: string): Promise<void> {
    if (!this._mongoDBClient || !this._redisClient) {
      throw new Error('database clients not setup');
    }
    await this._mongoDBClient.addPlayerToTown(playerID, coveyTownID);
    await this._redisClient.addPlayerToTown(playerID, coveyTownID);
  }

  async removePlayerFromTown(playerID: string, coveyTownID: string): Promise<void> {
    if (!this._mongoDBClient || !this._redisClient) {
      throw new Error('database clients not setup');
    }
    await this._mongoDBClient.removePlayerFromTown(playerID, coveyTownID);
    await this._redisClient.removePlayerFromTown(playerID, coveyTownID);
  }

  async savePlayer(player: CoveyPlayer): Promise<void> {
    if (!this._mongoDBClient || !this._redisClient) {
      throw new Error('database clients not setup');
    }
    await this._mongoDBClient.savePlayer(player);
    await this._redisClient.savePlayer(player);
  }

}