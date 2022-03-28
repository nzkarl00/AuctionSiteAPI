import {Request, Response} from "express";
import { getPool } from "../../config/db";

const authorize = async (req: Request) : Promise<number> => {
    const conn = await getPool().getConnection();
    const tokenHeader = req.header("X-Authorization");
    if (tokenHeader !== undefined) {
        const query = 'SELECT id FROM user WHERE auth_token = ?'
        const [result] = await conn.query(query, tokenHeader);
        conn.release();
        if (result.length === 0) {
            return -1;
        } else {
            return result[0].id;
        }
    } else {
        return -1;
    }
}

export {authorize}