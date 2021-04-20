import { CoveyPlayer, CoveyTown } from './DBTypes';

export default interface IDBClient {
  saveTown(coveyTown: CoveyTown): Promise<void>;
  getTown(coveyTownID: string): Promise<CoveyTown | null>;
  deleteTown(coveyTownID: string): Promise<void>;
  addPlayerToTown(playerID: string, coveyTownID: string): Promise<void>;
  savePlayer(player: CoveyPlayer): Promise<void>;
}