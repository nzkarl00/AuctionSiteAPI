import * as users from '../models/users.model';
import Logger from "../../config/logger";
import {Request, Response} from "express";
import {authorize} from "../middleware/auth.middleware";
import {doesUserExist, getPhoto, userHasImage} from "../models/users.model";
import fs from "mz/fs";
import mime from "mime";
import {auctionHasImage} from "../models/auctions.model";
import * as auctions from "../models/auctions.model";

const create = async (req: Request, res: Response) : Promise<void> => {
    if (! req.body.hasOwnProperty("firstName")) {
        res.status(400).send("Please provide firstName field");
        return
    }
    if (! req.body.hasOwnProperty("lastName")) {
        res.status(400).send("Please provide lastName field");
        return
    }
    if (! req.body.hasOwnProperty("email")) {
        res.status(400).send("Please provide email field");
        return
    }
    if (! req.body.hasOwnProperty("password")) {
        res.status(400).send("Please provide password field");
        return
    }
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const email = req.body.email;
    const password = req.body.password;
    Logger.http(`POST Create user ${firstName} ${lastName}`)
    try {
        const result = await users.insert(firstName, lastName, email, password);
        res.status( 201 ).send({"userId": result.insertId} );
    } catch( err ) {
        res.status( 500 ).send( `ERROR creating user ${firstName} ${lastName}: ${
            err }` );
    }
}

const read = async (req: Request, res: Response) : Promise<void> => {
    const id = req.params.id;
    Logger.http(`GET user id: ${id}`)
    const auth = await authorize(req);
    try {
        const result = await users.get(parseInt(id, 10), auth);
        if (result.length === 0) {
            res.status(404).send(`User ${id} not found`);
        } else {
            Logger.debug(`Test value ${result[0]}`)
            res.status(200).send(result[0]);
        }
    } catch(err) {
        res.status(500).send(`ERROR reading user ${id}: ${err}`);
    }
}

const update = async (req: Request, res: Response) : Promise<void> => {
    const id = req.params.id;
    Logger.http(`PATCH update user id: ${id}`);
    const firstName = req.body.firstName;
    const lastName  = req.body.lastName;
    const email = req.body.email;
    const password = req.body.password;
    const currentPassword = req.body.currentPassword;
    const auth = await authorize(req);
    if (parseInt(id,10) !== auth) {
        res.status(403).send(`Forbidden, user id: ${id} is not logged in`);
    } else {
        if (email !== undefined ) {
            if (!email.includes('@')) {
                res.status(400).send(`Email ${email} does not contain an @, bad request`);
            }
        }
        const result = await users.get(parseInt(id, 10), auth);
        if (result.length === 0) {
            res.status(400).send(`Invalid user id`);
        } else {
            try {
                const ret = await users.alter(parseInt(id, 10), auth, firstName, lastName, email, password, currentPassword);
                if (ret === true) {
                    res.status(200).send(`Successfully updated details of user ${id}`);
                } else {
                    res.status(401).send(`Invalid current password, cannot update to new password`);
                }
            } catch (err) {
                res.status(500).send(`ERROR updating user ${id}: ${err}`);
            }
        }
    }
}

const login = async (req: Request, res: Response) : Promise<void> => {
    if (!req.body.hasOwnProperty("email")) {
        res.status(400).send("Please provide email field");
        return
    }
    if (!req.body.hasOwnProperty("password")) {
        res.status(400).send("Please provide password field");
        return
    }
    const email = req.body.email;
    const password = req.body.password;
    Logger.http(`POST attempting to log in user ${email}`)
    try {
        const result = await users.login(email, password);
        if (result) {
            // TODO, token is not a string?
            Logger.debug(`Type of token: ${typeof result[0].token}`)
            res.status(200).send(result[0]);
        } else {
            res.status(400).send(`Failed to log in, username and password do not match`);
        }
    } catch (err) {
        res.status(500).send(`ERROR logging in user ${email}: ${err}`);
    }
}

const logout = async (req: Request, res: Response) : Promise<void> => {
    const tokenHeader = "X-Authorization";
    const header = req.header(tokenHeader)
    if (!header) {
        res.status(401).send(`Unauthorized, user is not signed in`);
    } else {
        Logger.http(`POST attempting to log out user`);
        try {
            await users.logout(header);
            res.status(200).send(`User successfully logged out`);
        } catch(err) {
            res.status(500).send(`ERROR logging out user: ${err}`);
        }
    }
}

const addImage = async (req: Request, res: Response) : Promise<void> => {
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
        if (!await doesUserExist(parseInt(id, 10))) {
            res.status(404).send(`User ${id} not found`);
            return;
        }
        if (auth !== parseInt(id, 10)) {
            res.status(403).send(`Cannot change another user's photo`);
            return;
        }
        const isEdit = await userHasImage(parseInt(id, 10));
        const filePath = "user_" + id + "." + imageType.split("/")[1]
        const photo = await fs.writeFile("storage/images/" + filePath, req.body, 'base64');
        const result = await users.updatePhoto(parseInt(id, 10), filePath);
        if (isEdit) {
            res.status(200).send(`Image successfully updated for user ${id}`);
            return;
        } else {
            res.status(201).send(`Image successfully uploaded to user ${id}`);
            return;
        }
    } catch(err) {
        res.status(500).send(`ERROR uploading photo: ${err}`);
        return;
    }
}

const viewImage = async (req: Request, res: Response) : Promise<void> => {
    const id = req.params.id;
    try {
        if (!await doesUserExist(parseInt(id, 10))) {
            res.status(404).send(`User ${id} not found`);
            return;
        }
        if (!await userHasImage(parseInt(id, 10))) {
            res.status(404).send(`User ${id} has no photo`);
            return;
        }
        const result = await users.getPhoto(parseInt(id, 10));
        const path = "storage/images/" + result;
        const photo = await fs.readFile("storage/images/" + result);
        res.status(200).contentType(mime.getType("storage/images/" + result)).send(photo);
        return;
    } catch(err) {
        res.status(500).send(`ERROR getting photo for user ${id}: ${err}`);
        return;
    }
}

const deleteImage = async(req: Request, res: Response) : Promise<void> => {
    const id = req.params.id;
    const auth = await authorize(req);
    if (auth === -1) {
        res.status(401).send(`Cannot delete photo, user not logged in`);
        return;
    }
    try {
        if (!await doesUserExist(parseInt(id, 10))) {
            res.status(404).send(`User ${id} not found`);
            return;
        }
        if (!await userHasImage(parseInt(id, 10))) {
            res.status(404).send(`User ${id} has no photo`);
            return;
        }
        if (auth !== parseInt(id, 10)) {
            res.status(403).send(`Cannot change another user's photo`);
            return;
        }
        const result = await users.removePhoto(parseInt(id, 10));
        res.status(200).send(`Deleted photo for user ${id}`);
    } catch(err) {
        res.status(500).send(`ERROR deleting photo for user ${id}: ${err}`);
        return;
    }
}

export {create, read, update, login, logout, addImage, viewImage, deleteImage}

