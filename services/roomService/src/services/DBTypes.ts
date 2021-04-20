export type CoveyTown = {
  coveyTownID: string,
  friendlyName: string,
  townUpdatePassword: string,
  isPubliclyListed: boolean,
  occupancy: number,
  capacity: number,
  players: string[]
};

export type CoveyPlayer = {
  id: string,
  userName: string
};
