import {Express} from "express";
import * as users from '../controllers/users.controller';
import {rootUrl} from "./base.routes";
module.exports = ( app: Express ) => {
    app.route(rootUrl + '/users/register')
        .post(users.create);
    app.route(rootUrl + '/users/:id')
        .get(users.read)
        .put(users.update)
};