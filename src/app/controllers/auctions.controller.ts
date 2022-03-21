import {Request, Response} from "express";
import Logger from '../../config/logger';
import * as auctions from '../models/auctions.model';

const list = async (req: Request, res: Response) : Promise<void> => {
    Logger.http(`GET selection of auctions`);
    const startIndex = req.params.startIndex;
    const count = req.params.count;
    const q = req.params.q;
    const categoryIds = req.params.categoryIds;
    const sellerId = req.params.sellerId;
    const bidderId = req.params.bidderId;
    const sortBy = req.params.sortBy;
    try {
        // Todo parse list of ints for category ID
        const result = await auctions.getSelection(parseInt(startIndex, 10), parseInt(count, 10), q, [parseInt(categoryIds, 10)], parseInt(sellerId, 10), parseInt(bidderId, 10), sortBy);
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
    const description = req.body.description;
    const categoryId = req.body.categoryId;
    const endDate = req.body.endDate;
    const reserve = 0; // TODO
    const sellerId = 0; // TODO
    if (Date.parse(endDate) > Date.now()) {
        res.status(400).send("Please provide endDate that is not in the future");
    }
    Logger.http(`POST create auction with title ${title}`);
    try {
        const result = await auctions.insert(title, description, new Date(endDate), reserve, sellerId, categoryId);
    } catch {
        // TODO
    }
}