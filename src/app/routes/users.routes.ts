import {Express} from "express";
import * as users from '../controllers/users.controller';
import {rootUrl} from "./base.routes";
module.exports = ( app: Express ) => {
    app.route(rootUrl + '/users/:id')
        .get(users.read)
        .patch(users.update)
    app.route(rootUrl + '/users/:id/image')
        .get(users.viewImage)
        .put(users.addImage)
        .delete(users.deleteImage)
    app.route(rootUrl + '/users/register')
        .post(users.create);
    app.route(rootUrl + '/users/login')
        .post(users.login);
    app.route(rootUrl + '/users/logout')
        .post(users.logout);
};