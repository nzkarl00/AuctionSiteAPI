import { getPool } from "../../config/db";
import Logger from "../../config/logger";
import {ResultSetHeader} from "mysql2";

const getSelection = async (startIndex: string, count: string, q: string, categoryIds: string, sellerId: string, bidderId: string, sortBy: string) : Promise<Auction[]> => {
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

const insertBid = async(auctionId: number, amount: number, bidderId: number) : Promise<ResultSetHeader[]> => {
    Logger.info(`Creating bit of ${amount} on auction ${auctionId}`);
    const conn = await getPool().getConnection();
    const query = 'INSERT INTO auction_bid (auction_id, user_id, amount, timestamp) values (?, ?, ?, ?)';
    const result = await conn.query(query, [auctionId, bidderId, amount, new Date()]);
    conn.release();
    return result;
}

const getBids = async(auctionId: number) : Promise<Bid[]> => {
    Logger.info(`Getting bids for auction id ${auctionId}`);
    const conn = await getPool().getConnection();
    const query = 'SELECT user_id as bidderId, amount, first_name as firstName, last_name as lastName, timestamp from auction_bid join user on auction_bid.user_id=user.id WHERE auction_id=? ORDER BY amount DESC'
    const [ result ] = await conn.query(query, [auctionId]);
    conn.release();
    return result;
}

const isBidGreaterThanMax = async(amount: number, auctionId: number) : Promise<boolean> => {
    const conn = await getPool().getConnection();
    const query = 'select max(amount) as max from auction_bid where auction_id = ?'
    const result = await conn.query(query, [auctionId]);
    return result[0][0].max < amount;
}

const isAuctionFinished = async(auctionId: number) : Promise<boolean> => {
    const conn = await getPool().getConnection();
    const query = 'SELECT end_date FROM auction WHERE id = ?';
    const result = await conn.query(query, [auctionId]);
    const things = result[0][0].end_date < Date.now();
    return result[0][0].end_date < Date.now();
}

const doesAuctionExist = async(auctionId: number) : Promise<boolean> => {
    const conn = await getPool().getConnection();
    const query = 'SELECT * FROM auction WHERE id = ?';
    const [ result ] = await conn.query(query, [auctionId]);
    return result.length !== 0;
}

const isAuctionOwner = async(auctionId: number, userId: number) : Promise<boolean> => {
    const conn = await getPool().getConnection();
    const query = 'SELECT seller_id as seller from auction where id = ?';
    const result = await conn.query(query, [auctionId]);
    return result[0][0].seller === userId;
}

const buildQuery = async(q: string, categoryIds: string, sellerId: string, bidderId: string, sortBy: string) : Promise<String> => {
    let query = 'select auction_id as auctionId, auction.title, auction.category_id as categoryId, auction.seller_id as sellerId, user.first_name as sellerFirstName, user.last_name as sellerLastName, reserve, ' +
    'count(*), max(amount) as highestBid, end_date as endDate from auction_bid join auction on auction.id = auction_bid.auction_id join user on auction.seller_id = user.id';
    if (q !== undefined && sellerId !== undefined && bidderId !== undefined && sortBy !== undefined) {
        query += ' WHERE 1=1'
        if (q !== undefined) {
            query += ' AND title LIKE %?% OR description LIKE %?%';
        }
    }
}

export { getSelection, getOne, insert, remove, insertBid, getBids, isAuctionFinished, doesAuctionExist, isBidGreaterThanMax, isAuctionOwner }

const omegaquery = "SELECT auction.id as auctionId, auction.title, auction.category_id as categoryId, auction.seller_id as sellerId, user.first_name as sellerFirstName, user.last_name as sellerLastName, reserve, count(*) as numBids, max(amount) as highestBid, end_date as endDate FROM auction join user on auction.seller_id=user.id join auction_bid on auction_bid.auction_id = auction.id where auction.id IN (select auction_id from auction_bid WHERE auction_bid.user_id=2) group by auction.id;";