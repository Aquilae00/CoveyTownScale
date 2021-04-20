import asyncRedis from 'async-redis';
import Redis, { Commands, RedisClient } from 'redis';
import { promisify } from 'util';
import assert from 'assert';
import IDBClient from './IDBClient';
import { CoveyPlayer, CoveyTown } from './DBTypes';

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

type Omitted = Omit<RedisClient, keyof Commands<boolean>>;

interface Promisified<T = RedisClient>
  extends Omitted,
  Commands<Promise<boolean>> { }

export default class RedisDBClient implements IDBClient {
  private static _client: RedisDBClient | null = null;

  private _host: string;

  private _port: number;

  private _dbClient: Promisified<RedisClient> | null = null;

  constructor() {
    this._host = '127.0.0.1';
    this._port = 6379;
  }

  private async setup(): Promise<Promisified<RedisClient>> {
    const clientPromise = promisify<RedisClient>(() => Redis.createClient({ host: this._host, port: this._port }));
    const client = await clientPromise();
    const promisifiedClient = asyncRedis.decorate(client);
    this._dbClient = promisifiedClient;
    process.on('SIGINT', this._dbClient.quit);
    process.on('exit', this._dbClient.quit);
    return this._dbClient;
  }

  public static async setup(): Promise<RedisDBClient> {
    let result = null;

    if (!RedisDBClient._client) {
      RedisDBClient._client = new RedisDBClient();
    }

    try {
      result = await RedisDBClient._client.setup();
      if (!result) {
        RedisDBClient._client = null;
      }
    } catch (err) {
      RedisDBClient._client = null;
      throw err;
    }

    if (!RedisDBClient._client) {
      throw new Error('Failed to setup MongoDBClient');
    }

    return RedisDBClient._client;
  }

  async saveTown(coveyTown: CoveyTown): Promise<void> {
    if (!this._dbClient) {
      throw new Error('dbClient not setup');
    }
    await this._dbClient.hset(`town:${coveyTown.coveyTownID}`,
      'friendlyName', coveyTown.friendlyName,
      'isPubliclyListed', coveyTown.isPubliclyListed.toString(),
      'capacity', coveyTown.capacity.toString(),
      'occupancy', coveyTown.occupancy.toString(),
      'townUpdatePassword', coveyTown.townUpdatePassword);


    coveyTown.players.forEach(async (playerID) => {
      assert(this._dbClient);
      await this._dbClient.sadd(`town:${coveyTown.coveyTownID}:players`, playerID);
    });

  }

  async getTown(coveyTownID: string): Promise<CoveyTown | null> {
    if (!this._dbClient) {
      throw new Error('dbClient not setup');
    }

    const redisTown: any = await this._dbClient.hgetall(`town:${coveyTownID}`);
    if (!redisTown) {
      return null;
    }
    const redisPlayers: any = await this._dbClient.smembers(`town:${coveyTownID}:players`);
    const coveyTown: CoveyTown = {
      coveyTownID,
      friendlyName: redisTown.friendlyName,
      isPubliclyListed: redisTown.isPubliclyListed,
      capacity: redisTown.capacity,
      occupancy: redisTown.occupancy,
      townUpdatePassword: redisTown.townUpdatePassword,
      players: redisPlayers,
    };

    return coveyTown;
  }

  async deleteTown(coveyTownID: string): Promise<void> {
    if (!this._dbClient) {
      throw new Error('dbClient not setup');
    }
    await this._dbClient.del(`town:${coveyTownID}`, `town:${coveyTownID}:players`);
  }

  async addPlayerToTown(playerID: string, coveyTownID: string): Promise<void> {
    if (!this._dbClient) {
      throw new Error('dbClient not setup');
    }

    await this._dbClient.sadd(`town:${coveyTownID}:players`, playerID);
  }

  async savePlayer(player: CoveyPlayer): Promise<void> {
    if (!this._dbClient) {
      throw new Error('dbClient not setup');
    }

    await this._dbClient.hset(`player:${player.id}`, 'username', player.userName);
  }
}