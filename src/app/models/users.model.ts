import { getPool } from "../../config/db";
import Logger from "../../config/logger";
import {ResultSetHeader} from "mysql2";
import { hash, verify } from "./password.model";

const get = async (userId: number) : Promise<User[]> => {
    Logger.info(`Getting user ${userId} from the database`);
    const conn = await getPool().getConnection();
    const query = 'select first_name as firstName, last_name as lastName from user where id = ?';
    const [ rows ] = await conn.query( query, [ userId ] );
    conn.release();
    return rows;
}

const insert = async (firstName: string, lastName: string, email: string, password: string) : Promise<ResultSetHeader> => {
    Logger.info(`Registering user ${firstName} ${lastName}`);
    const conn = await getPool().getConnection();
    const hashed = await hash(password);
    const query = 'insert into user (first_name, last_name, email, password) values (?, ?, ?, ?)';
    const [ result ] = await conn.query( query, [firstName, lastName, email, hashed]);
    conn.release();
    return result;
}

const login = async (email: string, password: string) : Promise<ResultSetHeader> => {
    Logger.info(`Attempting to log in user ${email}`);
    const conn = await getPool().getConnection();
    const query = 'select password from user where user.email = ?';
    const [ result ] = await conn.query( query, [email]);
    Logger.info(`${result}`);
    conn.release();
    return result;
}

const alter = async (id: number, firstName: string, lastName: string, email: string, password: string, currentPassword: string) : Promise<ResultSetHeader> => {
    Logger.info(`Updating details of user ${id}`);
    const conn = await getPool().getConnection();
    const query = 'update user set first_name = ? and last_name = ? and email = ? and password = ? where user.id = ?';
    const [ result ] = await conn.query( query, [firstName, lastName, email, password, id]);
    conn.release();
    return result;
}

export {get, insert, login, alter}