import * as users from '../models/users.model';
import Logger from "../../config/logger";
import {Request, Response} from "express";
import {authorize} from "../middleware/auth.middleware";

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
    try {
        await users.alter(parseInt(id, 10), firstName, lastName, email, password, currentPassword);
        res.status(200).send(`Successfully updated details of user ${id}`)
    } catch(err) {
        res.status(500).send(`ERROR updating user ${id}: ${err}`);
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
    }
    Logger.http(`POST attempting to log out user`);
    try {
        await users.logout(header);
        res.status(200).send(`User successfully logged out`);
    } catch(err) {
        res.status(500).send(`ERROR logging out user: ${err}`);
    }
}

export {create, read, update, login, logout}

