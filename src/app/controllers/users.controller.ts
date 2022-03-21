import * as users from '../models/users.model';
import Logger from "../../config/logger";
import {Request, Response} from "express";

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
        res.status( 201 ).send({"user_id": result.insertId} );
    } catch( err ) {
        res.status( 500 ).send( `ERROR creating user ${firstName} ${lastName}: ${
            err }` );
    }
};

const read = async (req: Request, res: Response) : Promise<void> => {
    const id = req.params.id;
    Logger.http(`GET user id: ${id}`)
    try {
        const result = await users.get(parseInt(id, 10));
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

const update = async (req: Request, res: Response) : Promise<any> => {
    const id = req.params.id;
    Logger.http(`PATCH update uder id: ${id}`);
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
    if (! req.body.hasOwnProperty("currentPassword")) {
        res.status(400).send("Please provide currentPassword field");
        return
    }
    const firstName = req.body.firstName;
    const lastName  = req.body.lastName;
    const email = req.body.email;
    const password = req.body.password;
    const currentPassword = req.body.currentPassword;
    try {
        const result = await users.alter(parseInt(id, 10), firstName, lastName, email, password, currentPassword);
        res.status(200).send(`Successfully updated details of user ${id}`)
    } catch(err) {
        res.status(500).send(`ERROR updating user ${id}: ${err}`);
    }
}
export {create, read, update}

