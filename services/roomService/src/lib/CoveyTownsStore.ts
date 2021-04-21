import CoveyTownController from './CoveyTownController';
import { CoveyTownList } from '../CoveyTypes';
import RedisDBClient from '../services/RedisClient';
import IDBClient from '../services/IDBClient';
import MongoDBClient from '../services/MongoDBClient';
import ClusterClient from '../services/ClusterClient';
import { CoveyTown } from '../services/DBTypes';

function passwordMatches(provided: string, expected: string): boolean {
  if (provided === expected) {
    return true;
  }
  if (process.env.MASTER_TOWN_PASSWORD && process.env.MASTER_TOWN_PASWORD === provided) {
    return true;
  }
  return false;
}

export default class CoveyTownsStore {
  private static _instance: CoveyTownsStore;

  private _towns: CoveyTownController[] = [];

  private _clusterClient: Promise<ClusterClient>;

  constructor() {
    this._clusterClient = ClusterClient.getInstance();
  }

  static async getInstance(): Promise<CoveyTownsStore> {
    if (CoveyTownsStore._instance === undefined) {
      CoveyTownsStore._instance = new CoveyTownsStore();
      try {
        const dbClient = await this._instance._clusterClient;
        const dbTowns = await dbClient.getTowns();
        dbTowns.forEach(async town => {
          dbClient.deleteTown(town.coveyTownID);
          await CoveyTownsStore._instance.createTown(town.friendlyName, town.isPubliclyListed);
        });
      } catch (err) {
        throw new Error(`Failed to Initialize Towns from DB: ${err.toString()}`);
      }
    }
    return CoveyTownsStore._instance;
  }

  getControllerForTown(coveyTownID: string): CoveyTownController | undefined {
    return this._towns.find(town => town.coveyTownID === coveyTownID);
  }

  async getTowns(): Promise<CoveyTownList> {
    const towns = await (await this._clusterClient).getTowns();
    return towns.filter(coveyTown => coveyTown.isPubliclyListed)
      .map(coveyTown => ({
        coveyTownID: coveyTown.coveyTownID,
        friendlyName: coveyTown.friendlyName,
        currentOccupancy: coveyTown.occupancy,
        maximumOccupancy: coveyTown.capacity,
      }));
  }

  async createTown(friendlyName: string, isPubliclyListed: boolean): Promise<CoveyTownController> {
    const newTown = new CoveyTownController(friendlyName, isPubliclyListed);
    (await this._clusterClient).saveTown(newTown.toCoveyTown());
    this._towns.push(newTown);
    return newTown;
  }

  async updateTown(coveyTownID: string, coveyTownPassword: string, friendlyName?: string, makePublic?: boolean): Promise<boolean> {
    const existingTown = this.getControllerForTown(coveyTownID);
    if (existingTown && passwordMatches(coveyTownPassword, existingTown.townUpdatePassword)) {
      if (friendlyName !== undefined) {
        if (friendlyName.length === 0) {
          return false;
        }
        existingTown.friendlyName = friendlyName;
      }
      if (makePublic !== undefined) {
        existingTown.isPubliclyListed = makePublic;
      }
      await (await this._clusterClient).saveTown(existingTown.toCoveyTown());
      return true;
    }
    return false;
  }

  async deleteTown(coveyTownID: string, coveyTownPassword: string): Promise<boolean> {
    const existingTown = this.getControllerForTown(coveyTownID);
    if (existingTown && passwordMatches(coveyTownPassword, existingTown.townUpdatePassword)) {
      this._towns = this._towns.filter(town => town !== existingTown);
      existingTown.disconnectAllPlayers();
      await (await this._clusterClient).deleteTown(coveyTownID);
      return true;
    }
    return false;
  }

}
