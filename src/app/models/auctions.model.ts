import { getPool } from "../../config/db";
import Logger from "../../config/logger";
import {ResultSetHeader} from "mysql2";

let paramList: (string | number)[] = [];

const getSelection = async (startIndex: number, count: number, q: string, categoryIds: number[], sellerId: number, bidderId: number, sortBy: string) : Promise<Auction[]> => {
    Logger.info(`Getting auctions from the database starting from index ${startIndex} with search term ${q}`);
    paramList = [];
    const conn = await getPool().getConnection();
    const query = await buildQuery(q, categoryIds, sellerId, bidderId, sortBy);
    const [ rows ] = await conn.query( query, paramList );
    conn.release();
    return rows;
};

const getOne = async (auctionId: number) : Promise<Auction[]> => {
    Logger.info(`Getting auction with id ${auctionId}`);
    const conn = await getPool().getConnection();
    const query = 'SELECT auction.id as auctionId, auction.title, auction.description, auction.category_id as categoryId, auction.seller_id as sellerId, user.first_name as sellerFirstName, ' +
        'user.last_name as sellerLastName, reserve, count(auction_bid.id) as numBids, max(amount) as highestBid, end_date as endDate from auction_bid right join auction on auction.id = auction_bid.auction_id join user on auction.seller_id = user.id WHERE auction.id=? GROUP BY auction.id';
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

const buildQuery = async(q: string, categoryIds: number[], sellerId: number, bidderId: number, sortBy: string) : Promise<(any)> => {
    let query = 'select auction.id as auctionId, auction.title, auction.category_id as categoryId, auction.seller_id as sellerId, user.first_name as sellerFirstName, user.last_name as sellerLastName, reserve, ' +
    'count(auction_bid.id) as numBids, max(amount) as highestBid, end_date as endDate from auction_bid right join auction on auction.id = auction_bid.auction_id join user on auction.seller_id = user.id';
    if (q !== undefined || sellerId !== undefined || bidderId !== undefined || categoryIds !== undefined) {
        query += ' WHERE 1=1'
        if (q !== undefined) {
            query += " AND auction.title LIKE ? OR auction.description LIKE ?";
            paramList.push(q);
            paramList.push(q);
        }
        if (categoryIds !== undefined && categoryIds.length > 0) {
            query += ' AND auction.category_id = ?';
            paramList.push(categoryIds[0]);
            for (let i = 1; i < categoryIds.length; i++) {
                query += ' OR auction.category_id = ?';
                paramList.push(categoryIds[i]);
            }
        }
        if (sellerId !== undefined) {
            query += ' AND auction.seller_id = ?';
            paramList.push(sellerId);
        }
        if (bidderId !== undefined) {
            query += ' AND auction.id IN (select auction_id from auction_bid WHERE auction_bid.user_id=?)';
            paramList.push(bidderId);
        }
    }
    query += ' GROUP BY auction.id';
    switch (sortBy) {
        case undefined: {
            query += ' ORDER BY endDate ASC';
            break;
        }
        case 'CLOSING_SOON': {
            query += ' ORDER BY endDate ASC';
            break;
        }
        case 'ALPHABETICAL_ASC': {
            query += ' ORDER BY auction.title ASC';
            break;
        }
        case 'ALPHABETICAL_DESC': {
            query += ' ORDER BY auction.title DESC';
            break;
        }
        case 'BIDS_ASC': {
            query += ' ORDER BY highestBid ASC';
            break;
        }
        case 'BIDS_DESC': {
            query += ' ORDER BY highestBid DESC';
            break;
        }
        case 'CLOSING_LAST': {
            query += ' ORDER BY endDate ASC';
            break;
        }
        case 'RESERVE_ASC': {
            query += ' ORDER BY auction.reserve ASC';
            break;
        }
        case 'RESERVE_DESC': {
            query += ' ORDER BY auction.reserve DESC';
            break;
        }
    }
    return query;
}

export { getSelection, getOne, insert, remove, insertBid, getBids, isAuctionFinished, doesAuctionExist, isBidGreaterThanMax, isAuctionOwner }