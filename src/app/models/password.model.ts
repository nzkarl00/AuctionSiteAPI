const hash = async(password: string) : Promise<string> => {
    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
}

const verify = async(password: string, hashedPassword: string) : Promise<boolean> => {
    const bcrypt = require('bcrypt');
    return bcrypt.compareSync(password, hashedPassword);
}
export{hash, verify}