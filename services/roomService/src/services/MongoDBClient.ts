import MongoPackage from 'mongodb';
import { CoveyTown } from './DBTypes';
import IDBClient from './IDBClient';
import IMongoDBClient from './IMongoDBClient';

interface Database {
  name: string,
  coveyTowns: string;
}


const coveyTownDB: Database = {
  name: 'coveytowndb',
  coveyTowns: 'coveyTowns',
};


export default class MongoDBClient implements IDBClient {
  private static _client: MongoDBClient | null = null;

  private _url: string;

  private _dbClient: MongoPackage.MongoClient | null = null;

  constructor() {
    this._url = '';
  }

  private async setup(): Promise<MongoPackage.MongoClient> {
    this._dbClient = await MongoPackage.MongoClient.connect(this._url, { useUnifiedTopology: true });
    process.on('SIGINT', this._dbClient.close);
    process.on('exit', this._dbClient.close);
    return this._dbClient;
  }

  public static async setup(): Promise<MongoDBClient> {
    let result = null;

    if (!MongoDBClient._client) {
      MongoDBClient._client = new MongoDBClient();
    }

    try {
      result = await MongoDBClient._client.setup();
      if (!result) {
        MongoDBClient._client = null;
      }
    } catch (err) {
      MongoDBClient._client = null;
      throw err;
    }

    if (!MongoDBClient._client) {
      throw new Error('Failed to setup MongoDBClient');
    }

    return MongoDBClient._client;
  }

  async addPlayerToTown(playerID: string, coveyTownID: string): Promise<void> {
    if (!this._dbClient) {
      throw new Error('dbClient not setup');
    }

    const db = coveyTownDB.name;
    const collection = coveyTownDB.coveyTowns;
    const towndb = this._dbClient.db(db).collection(collection);
    await towndb.updateOne({ coveyTownID }, { $push: { players: playerID } });
  }

  async saveTown(coveyTown: CoveyTown): Promise<void> {
    if (!this._dbClient) {
      throw new Error('dbClient not setup');
    }

    const db = coveyTownDB.name;
    const collection = coveyTownDB.coveyTowns;
    await this._dbClient.db(db).collection(collection).updateOne({ coveyTownID: coveyTown.coveyTownID }, { $set: coveyTown }, { upsert: true });
  }

  async getTown(coveyTownID: string): Promise<CoveyTown | null> {
    if (!this._dbClient) {
      throw new Error('dbClient not setup');
    }

    const db = coveyTownDB.name;
    const collection = coveyTownDB.coveyTowns;
    const towndb = this._dbClient.db(db).collection(collection);
    const coveyTown: CoveyTown | null = await towndb.findOne({ coveyTownID }, { projection: { _id: 0 } });
    return coveyTown;
  }

  async deleteTown(coveyTownID: string): Promise<void> {
    if (!this._dbClient) {
      throw new Error('dbClient not setup');
    }
    const db = coveyTownDB.name;
    const collection = coveyTownDB.coveyTowns;
    const towndb = this._dbClient.db(db).collection(collection);
    await towndb.deleteOne({ coveyTownID });
  }
}

