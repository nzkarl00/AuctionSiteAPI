import {Request, Response} from "express";
import Logger from '../../config/logger';
import * as auctions from '../models/auctions.model';
import {authorize} from "../middleware/auth.middleware";
import fs from 'mz/fs';
import {
    auctionHasBids, auctionHasImage,
    doesAuctionExist,
    isAuctionFinished,
    isAuctionOwner,
    isBidGreaterThanMax,
    isValidCategory
} from "../models/auctions.model";
import mime from 'mime';

const list = async (req: Request, res: Response) : Promise<void> => {
    Logger.http(`GET selection of auctions`);
    let startIndex: number;
    if (req.query.hasOwnProperty("startIndex")) {
        startIndex = parseInt(req.query.startIndex.toString(), 10);
    } else {
        startIndex = 0;
    }
    let count: number;
    if (req.query.hasOwnProperty("count")) {
        count = parseInt(req.query.count.toString(), 10);
    }
    let q: string;
    if (req.query.hasOwnProperty("q")) {
        q = '%' + req.query.q.toString() + '%';
    }
    let categoryIds: number[];
    if (req.query.hasOwnProperty("categoryIds")) {
        categoryIds = req.query.categoryIds.toString().split(',').map(Number);
    }
    let sellerId: number;
    if (req.query.hasOwnProperty("sellerId")) {
        sellerId = parseInt(req.query.sellerId.toString(), 10);
    }
    let bidderId: number;
    if (req.query.hasOwnProperty("bidderId")) {
        bidderId = parseInt(req.query.bidderId.toString(), 10);
    }
    let sortBy: string;
    if (req.query.hasOwnProperty("sortBy")) {
        sortBy = req.query.sortBy.toString();
    }
    try {
        const result = await auctions.getSelection(startIndex, count, q, categoryIds, sellerId, bidderId, sortBy);
        res.status(200).send({"auctions": result, "count": result.length});
        return;
    } catch( err ) {
        res.status( 500 ).send( `ERROR getting auctions: ${ err }`);
        return;
    }
};

const read = async (req: Request, res: Response) : Promise<void> => {
    const id = req.params.id;
    Logger.http(`GET single auction with ID ${id}`)
    try {
        const result = await auctions.getOne( parseInt(id, 10));
        if (result.length === 0) {
            res.status( 404 ).send('Auction not found')
            return;
        } else {
            res.status( 200 ).send( result[0] );
            return;
        }
    } catch(err) {
        res.status( 500 ).send(`ERROR reading auction ${id}: ${ err }`);
        return;
    }
};

const deleteAuction = async (req: Request, res: Response) : Promise<void> => {
    const id = parseInt(req.params.id, 10);
    const auth = await authorize(req);
    if (auth === -1) {
        res.status(401).send(`Cannot delete auction, user not logged in`);
        return;
    }
    try {
        if (await doesAuctionExist(id) === false) {
            res.status(404).send(`Auction not found`);
            return;
        }
        if (!await isAuctionOwner(id, auth)) {
            res.status(403).send(`Cannot delete another user's auction`);
            return;
        }
        if (await auctionHasBids(id)) {
            res.status(403).send(`Cannot delete an auction that has bids`);
            return;
        }
        const result = await auctions.remove(id);
        res.status(200).send(`Deleted auction with id ${result.insertId}`);
        return;
    } catch (err){
        res.status(500).send(`ERROR deleting auction: ${err}`);
        return;
    }
}

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
    try {
        if (sellerId === -1) {
            res.status(401).send("Unauthorized, user is not logged in");
            return;
        }
        if (Date.parse(endDate) < Date.now()) {
            res.status(400).send("Please provide endDate that is in the future");
            return;
        }
        if (!isValidCategory(categoryId)) {
            res.status(400).send("Invalid category ID");
            return;
        }
        const result = await auctions.insert(title, description, new Date(endDate), reserve, sellerId, categoryId);
        if (result.length === 0) {
            res.status(400).send(`Bad request, category ID not found`);
            return;
        } else {
            res.status(201).send({"auctionId": result[0].insertId});
            return;
        }
    } catch (err){
        res.status(500).send(`ERROR posting auction: ${err}`);
        return;
    }
}

const update = async (req: Request, res: Response) : Promise<void> => {
    const id = parseInt(req.params.id, 10);
    const title = req.body.title;
    const description = req.body.description;
    const categoryId = parseInt(req.body.categoryId, 10);
    let endDate = req.body.endDate;
    const reserve = parseInt(req.body.reserve, 10);
    const auth = await authorize(req);
    if (auth === -1) {
        res.status(401).send(`Cannot edit auction, user not logged in`);
        return;
    }
    try {
        if (await doesAuctionExist(id) === false) {
            res.status(404).send(`Auction not found`);
            return;
        }
        if (!await isAuctionOwner(id, auth)) {
            res.status(403).send(`Cannot edit another user's auction`);
            return;
        }
        if (await auctionHasBids(id)) {
            res.status(403).send(`Cannot edit an auction that has bids`);
            return;
        }
        if (req.body.hasOwnProperty("endDate")) {
            if (Date.parse(endDate) < Date.now()) {
                res.status(400).send("Please provide endDate that is in the future");
                return;
            }
            endDate = new Date(endDate);
        }
        if (req.body.hasOwnProperty("categoryId")) {
            if (!isValidCategory(categoryId)) {
                res.status(400).send("Invalid category ID");
                return;
            }
        }
        const result = await auctions.edit(id, title, description, categoryId, endDate, reserve);
        res.status(200).send(`Edited details of auction: ${id}`);
    } catch (err) {
    res.status(500).send(`ERROR editing auction: ${err}`);
    return;
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
        if (await doesAuctionExist(id) === false) {
            res.status(404).send(`Auction not found`);
            return;
        }
        if (await isAuctionOwner(id, auth)) {
            res.status(403).send(`Cannot bid on own auction`);
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
            return;
        }
    } catch (err) {
        res.status(500).send(`ERROR getting bids: ${err}`);
        return;
    }
}

const readCategories = async (req: Request, res: Response) : Promise<void> => {
    Logger.http(`Getting list of categories`);
    try {
        const result = await auctions.getCategories();
        res.status(200).send(result);
        return;
    } catch (err) {
        res.status(500).send(`ERROR getting categories: ${err}`);
        return;
    }
}

const viewImage = async (req: Request, res: Response) : Promise<void> => {

    const id = req.params.id;
    Logger.http(`Getting image for auction ${id}`);
    try {
        if (await doesAuctionExist(parseInt(id, 10)) === false) {
            res.status(404).send(`Auction not found`);
            return;
        }
        if (!auctionHasImage(parseInt(id, 10))) {
            res.status(404).send(`Auction image not found`)
            return;
        }
        const result = await auctions.getPhoto(parseInt(id, 10));
        const path = "storage/images/" + result;
        const photo = await fs.readFile("storage/images/" + result);
        res.status(200).contentType(mime.getType("storage/images/" + result)).send(photo);
        return;
    } catch (err) {
        res.status(500).send(`ERROR getting categories: ${err}`);
        return;
    }
}

const addImage = async (req: Request, res: Response) : Promise<void> => {
    Logger.http(`Setting auction image`);
    const id = req.params.id;
    const auth = await authorize(req);
    const imageType = req.header("Content-Type");
    if (auth === -1) {
        res.status(401).send(`Cannot upload photo, user not logged in`);
        return;
    }
    if (imageType !== "image/png" && imageType !== "image/jpeg" && imageType !== "image/gif") {
        res.status(400).send(`Invalid image type`);
        return;
    }
    try {
        if (await doesAuctionExist(parseInt(id, 10)) === false) {
            res.status(404).send(`Auction not found`);
            return;
        }
        if (!await isAuctionOwner(parseInt(id, 10), auth)) {
            res.status(403).send(`Cannot upload image to auction owned by another user`);
            return;
        }
        const isEdit = await auctionHasImage(parseInt(id, 10));
        const filePath = "auction_" + id + "." + imageType.split("/")[1]
        const photo = await fs.writeFile("storage/images/" + filePath, req.body, 'base64');
        const result = await auctions.updatePhoto(parseInt(id, 10), filePath);
        if (isEdit) {
            res.status(200).send(`Image successfully updated for auction ${id}`);
            return;
        } else {
            res.status(201).send(`Image successfully uploaded to auction ${id}`);
            return;
        }
    } catch (err) {
        res.status(500).send(`ERROR getting categories: ${err}`);
        return;
    }
}


export {list, read, create, createBid, readBids, deleteAuction, readCategories, update, viewImage, addImage }