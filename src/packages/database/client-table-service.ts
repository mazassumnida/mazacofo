import { connection } from "./connection";
import type { TRank } from "packages/codeforces/typing";

export type TClient = {
  handle: string;
  rank: TRank;
  rating: number;
  maxRank: TRank;
  topRating: number;
};

export const insertClient = async (client: TClient) => {
  const { handle, rank, rating, maxRank, topRating } = client;

  try {
    const [rows] = await connection.query(
      "INSERT INTO clients(clients.handle, clients.rank, clients.rating, clients.maxRank, clients.topRating) VALUES(?, ?, ?, ?, ?)",
      [handle, rank, rating, maxRank, topRating],
    );
  } catch (e) {
    console.error(e);
  }
};

export const updateClient = async (client: TClient) => {
  const { handle, rank, rating, maxRank, topRating } = client;
  try {
    const [rows] = await connection.query(
      `UPDATE clients AS c SET c.rank=?, c.rating=?, c.maxRank=?, c.topRating=? WHERE c.handle=?`,
      [rank, rating, maxRank, topRating, handle],
    );
  } catch (e) {
    console.error(e);
  }
};

export class ClientNotFoundError extends Error {
  constructor(handle: string) {
    super();
    this.name = "ClientNotFoundError";
    this.message = `Client not found for handle(${handle})`;
  }
}

export const getClient = async (handle: string): Promise<TClient> => {
  try {
    const [rows] = await connection.query(
      `SELECT * FROM clients WHERE handle=?`,
      [handle],
    );

    const typeCastedRows = rows as TClient[];

    if (typeCastedRows?.length > 0) {
      return typeCastedRows[0];
    }
  } catch (e) {
    console.error(e);
  }

  throw new ClientNotFoundError(handle);
};

export const getClients = async () => {
  try {
    const [rows] = await connection.query(`SELECT * FROM clients`);
    return rows;
  } catch (e) {
    console.error(e);
  }
};

export const removeClient = async (handle: string) => {
  try {
    await connection.query(`DELETE FROM clients WHERE handle=?`, [handle]);
  } catch (e) {
    console.error(e);
  }
};
