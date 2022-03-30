import {Request, Response} from "express";
import Logger from '../../config/logger';
import * as auctions from '../models/auctions.model';
import {authorize} from "../middleware/auth.middleware";
import {doesAuctionExist, isAuctionFinished, isAuctionOwner, isBidGreaterThanMax} from "../models/auctions.model";

const list = async (req: Request, res: Response) : Promise<void> => {
    Logger.http(`GET selection of auctions`);
    const startIndex = req.query.startIndex;
    const count = req.query.count;
    const q = req.query.q;
    const categoryIds = req.query.categoryIds;
    const sellerId = req.query.sellerId;
    const bidderId = req.query.bidderId;
    const sortBy = req.query.sortBy;
    try {
        // Todo parse list of ints for category ID
        const result = await auctions.getSelection(startIndex, count, q, categoryIds, sellerId, bidderId, sortBy);
        res.status(200).send(result);
    } catch( err ) {
        res.status( 500 ).send( `ERROR getting auctions: ${ err }`
        );
    }
};

const read = async (req: Request, res: Response) : Promise<void> => {
    const id = req.params.id;
    Logger.http(`GET single auction with ID ${id}`)
    try {
        const result = await auctions.getOne( parseInt(id, 10));
        if (result.length === 0) {
            res.status( 404 ).send('Auction not found')
        } else {
            res.status( 200 ).send( result[0] );
        }
    } catch(err) {
        res.status( 500 ).send(`ERROR reading auction ${id}: ${ err }`);
    }
};

const create = async (req: Request, res: Response) : Promise<void> => {
    if (!req.body.hasOwnProperty("title")) {
        res.status(400).send("Please provide title field");
    } else if (!req.body.hasOwnProperty("description")) {
        res.status(400).send("Please provide description field");
    } else if (!req.body.hasOwnProperty("categoryId")) {
        res.status(400).send("Please provide categoryId field");
    } else if (!req.body.hasOwnProperty("endDate")) {
        res.status(400).send("Please provide endDate field");
    }
    const title = req.body.title;
    Logger.http(`POST create auction with title ${title}`);
    const description = req.body.description;
    const categoryId = req.body.categoryId;
    const endDate = req.body.endDate;
    let reserve = req.body.reserve;
    const sellerId = await authorize(req);
    if (reserve === undefined) {
        reserve = 1;
    }
    if (sellerId === -1) {
        res.status(401).send("Unauthorized, user is not logged in");
        return;
    }
    if (Date.parse(endDate) < Date.now()) {
        res.status(400).send("Please provide endDate that is in the future");
        return;
    }
    try {
        const result = await auctions.insert(title, description, new Date(endDate), reserve, sellerId, categoryId);
        if (result.length === 0) {
            res.status(400).send(`Bad request, category ID not found`);
        } else {
            res.status(201).send({"auctionId": result[0].insertId});
        }
    } catch (err){
        res.status(500).send(`ERROR posting auction: ${err}`);
    }
}

const createBid = async(req: Request, res:Response) : Promise<void> => {
    const id = parseInt(req.params.id, 10);
    const amount = parseInt(req.body.amount, 10);
    Logger.http(`Creating bid on auction: ${id}`);
    const auth = await authorize(req);
    if (auth === -1) {
        res.status(401).send(`Cannot post bid, user not logged in`);
        return;
    }
    try {
        if (await isAuctionOwner(id, auth)) {
            res.status(403).send(`Cannot bid on own auction`);
        }
        if (await doesAuctionExist(id) === false) {
            res.status(404).send(`Auction not found`);
            return;
        }
        if (await isBidGreaterThanMax(amount, id) === false) {
            res.status(400).send(`Bid must be greater than existing max bid`);
            return;
        }
        if (await isAuctionFinished(id)) {
            res.status(403).send(`Cannot bid on auction that has closed`);
            return;
        }
        const result = await auctions.insertBid(id, amount, auth);
        res.status(201).send(`Bid created with id ${result[0].insertId} and amount ${amount} on auction ${id}`);
        return;
    } catch (err) {
        res.status(500).send(`ERROR creating bid: ${err}`);
        return;
    }
}

const readBids = async (req: Request, res: Response) : Promise<void> => {
    const id = parseInt(req.params.id, 10);
    Logger.http(`Getting bids for auction: ${id}`);
    try {
        const result = await auctions.getBids(id);
        if (result.length === 0) {
            res.status(404).send(`Auction: ${id} not found`);
            return;
        } else {
            res.status(200).send(result);
        }
    } catch (err) {
        res.status(500).send(`ERROR getting bids: ${err}`);
    }
}



export {list, read, create, createBid, readBids}