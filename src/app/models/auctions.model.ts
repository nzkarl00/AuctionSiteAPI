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
    const query = 'SELECT auction.id as auctionId, auction.title, auction.category_id as categoryId, auction.seller_id as sellerId, user.first_name as sellerFirstName, ' +
        'user.last_name as seller.LastName, reserve FROM auction join user on auction.seller_id=user.id WHERE auction.id = ?';
    const [ rows ] = await conn.query( query, [ auctionId ]);
    conn.release();
    return rows;
}

const insert = async (title: string, description: string, endDate: Date, reserve: number, sellerId: number, categoryId: number) : Promise<ResultSetHeader[]> => {
    Logger.info(`Adding auction to the database with title ${title}, end date ${endDate.toDateString()}, reserve ${reserve}, seller ID ${sellerId} and category ID ${categoryId}.`)
    const conn = await getPool().getConnection();
    let query = 'SELECT * FROM category WHERE id = ?';
    let [ result ] = await conn.query(query, [categoryId]);
    if (result.length === 0) {
        return result;
    } else {
        query = 'INSERT INTO auction (title, description, end_date, reserve, seller_id, category_id) values ( ?, ?, ?, ?, ?, ? )';
        result = await conn.query( query, [ title, description, endDate, reserve, sellerId, categoryId]);
        conn.release();
        return result;
    }

}

const remove = async (auctionId: number) : Promise<ResultSetHeader> => {
    Logger.info(`Deleting auction with id ${auctionId}`);
    const conn = await getPool().getConnection();
    const query = 'DELETE FROM auction WHERE auction_id = ?'
    const [ result ] = await conn.query( query, [ auctionId ] );
    conn.release();
    return result;
}

const insertBid = async(auctionId: number, amount: number, bidderId: number) : Promise<ResultSetHeader> => {
    Logger.info(`Creating bit of ${amount} on auction ${auctionId}`);
    const conn = await getPool().getConnection();
    let query = 'SELECT end_date FROM auction WHERE id = ?';
    let result = await conn.query(query, [auctionId]);
    if (result.length === 0) {
        return result;
    }
    if (result[0].end_date < Date.now()) {
        result = null;
        return result;
    }
    query = 'select max(amount) from auction_bid where auction_id = ?'
    result = await conn.query(query, [auctionId]);
    if (result.amount >= amount) {
        result = null;
        return result;
    }
    query = 'INSERT INTO auction_bid (auction_id, user_id, amount, timestamp) values (?, ?, ?, ?)';
    result = await conn.query(query, [auctionId, bidderId, amount, new Date()]);
    conn.release();
    return result;
}

const getBids = async(auctionId: number) : Promise<Bid> => {
    Logger.info(`Getting bids for auction id ${auctionId}`);
    const conn = await getPool().getConnection();
    const query = 'SELECT user_id as bidderId, amount, first_name as firstName, last_name as lastName, timestamp from auction_bid join user on auction_bid.user_id=user.id WHERE auction_id=?'
    const [ result ] = await conn.query(query, [auctionId]);
    conn.release();
    return result;
}

export { getSelection, getOne, insert, remove, insertBid, getBids}
