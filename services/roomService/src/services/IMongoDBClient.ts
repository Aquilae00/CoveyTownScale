import IDBClient from './IDBClient';

export default interface MongoDBClient extends IDBClient {
  addPlayerToTown(playerID: string, coveyTownID: string): any;
}