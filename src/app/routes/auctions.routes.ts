import {Express} from "express";
import {rootUrl} from "./base.routes"

import * as auctions from '../controllers/auctions.controller';

module.exports = (app: Express) => {
    app.route(rootUrl + '/auctions')
        .post(auctions.create)
        .get(auctions.list)
    app.route(rootUrl + '/auctions/:id/bids')
        .post(auctions.createBid)
        .get(auctions.readBids)
    app.route(rootUrl + '/auctions/:id')
        .get(auctions.read)
};