/* eslint-disable radix */
import asyncRedis from 'async-redis';
import dotenv from 'dotenv';
import Redis, { Commands, RedisClient } from 'redis';
import { promisify } from 'util';
import ioredis from 'ioredis';
import assert from 'assert';
import IDBClient from './IDBClient';
import { CoveyPlayer, CoveyTown } from './DBTypes';


dotenv.config();

export default class RedisDBClient implements IDBClient {
  private static _client: RedisDBClient | null = null;

  private _host1: string;

  private _host2: string;

  private _host3: string;

  private _port1: number;

  private _port2: number;

  private _port3: number;

  private _dbClient: ioredis.Cluster | null = null;

  constructor() {
    assert(process.env.REDIS_NODE1);
    assert(process.env.REDIS_NODE2);
    assert(process.env.REDIS_NODE3);
    assert(process.env.REDIS_NODE1_PORT);
    assert(process.env.REDIS_NODE2_PORT);
    assert(process.env.REDIS_NODE3_PORT);
    this._host1 = process.env.REDIS_NODE1;
    this._host2 = process.env.REDIS_NODE2;
    this._host3 = process.env.REDIS_NODE3;
    this._port1 = parseInt(process.env.REDIS_NODE1_PORT);
    this._port2 = parseInt(process.env.REDIS_NODE2_PORT);
    this._port3 = parseInt(process.env.REDIS_NODE3_PORT);
  }

  private async setup(): Promise<ioredis.Cluster> {
    if (!this._dbClient) {
      const clientPromise = new ioredis.Cluster([
        { host: this._host1, port: this._port1 },
        { host: this._host2, port: this._port2 },
        { host: this._host3, port: this._port3 },
      ]);
      // const client = await clientPromise();
      // const promisifiedClient = asyncRedis.decorate(client);
      this._dbClient = clientPromise;
      process.on('SIGINT', this._dbClient.quit);
      process.on('exit', this._dbClient.quit);
    }
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
    await this._dbClient.sadd('towns', coveyTown.coveyTownID);

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

  async getTowns(): Promise<CoveyTown[]> {
    if (!this._dbClient) {
      throw new Error('dbClient not setup');
    }
    const towns: any = await this._dbClient.smembers('towns');
    const coveyTowns: CoveyTown[] = [];
    // eslint-disable-next-line no-restricted-syntax
    for await (const coveyTownID of towns) {
      assert(this._dbClient);
      const redisTown: any = await this._dbClient.hgetall(`town:${coveyTownID}`);
      if (!redisTown) {
        return [];
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
      coveyTowns.push(coveyTown);
      return coveyTowns;
    }
    // console.log(coveyTowns);
    return coveyTowns;
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

  async removePlayerFromTown(playerID: string, coveyTownID: string): Promise<void> {
    if (!this._dbClient) {
      throw new Error('dbClient not setup');
    }
    await this._dbClient.srem(`town:${coveyTownID}:players`, playerID);
  }

  async savePlayer(player: CoveyPlayer): Promise<void> {
    if (!this._dbClient) {
      throw new Error('dbClient not setup');
    }
    await this._dbClient.hset(`player:${player.id}`, 'username', player.userName);
  }
}