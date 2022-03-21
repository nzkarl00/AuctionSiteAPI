import { getPool } from "../../config/db";
import Logger from "../../config/logger";
import {ResultSetHeader} from "mysql2";

const getSelection = async (startIndex: number, count: number, q: string, categoryIds: number[], sellerId: number, bidderId: number, sortBy: string) : Promise<Auction[]> => {
    Logger.info(`Getting auctions from the database starting from index ${startIndex} with search term ${q}`);
    const conn = await getPool().getConnection();
    const query = 'SELECT * FROM auction WHERE title LIKE %?% OR description LIKE %?% AND category_id IN ? AND seller_id = ? AND bidderId = ? ORDER BY ?';
    const [ rows ] = await conn.query( query, [q, q, categoryIds, sellerId, bidderId, sortBy] );
    conn.release();
    return rows;
};

const getOne = async (auctionId: number) : Promise<Auction[]> => {
    Logger.info(`Getting auction with id ${auctionId}`);
    const conn = await getPool().getConnection();
    const query = 'SELECT * FROM auction WHERE auction_id = ?';
    const [ rows ] = await conn.query( query, [ auctionId ]);
    conn.release();
    return rows;
}

const insert = async (title: string, description: string, endDate: Date, reserve: number, sellerId: number, categoryId: number) : Promise<ResultSetHeader> => {
    Logger.info(`Adding auction to the database with title ${title}, end date ${endDate.toDateString()}, reserve ${reserve}, seller ID ${sellerId} and category ID ${categoryId}.`)
    const conn = await getPool().getConnection();
    const query = 'INSERT INTO auction (title, description, end_date, reserve, seller_id, category_id) values ( ?, ?, ?, ?, ?, ? )'
    const [ result ] = await conn.query( query, [ title, description, endDate, reserve, sellerId, categoryId]);
    conn.release();
    return result;
}

const remove = async (auctionId: number) : Promise<ResultSetHeader> => {
    Logger.info(`Deleting auction with id ${auctionId}`);
    const conn = await getPool().getConnection();
    const query = 'DELETE FROM auction WHERE auction_id = ?'
    const [ result ] = await conn.query( query, [ auctionId ] );
    conn.release();
    return result;
}

export { getSelection, getOne, insert, remove}
