import express from "express";
import bodyParser from "body-parser"
import allowCrossOriginRequestsMiddleware from '../app/middleware/cors.middleware';
import Logger from "./logger";

export default () => {
    const app = express();
    // MIDDLEWARE
    app.use(allowCrossOriginRequestsMiddleware);
    app.use(bodyParser.json());
    app.use(bodyParser.raw({ type: 'text/plain' }));  // for the /executeSql endpoint
    app.use(bodyParser.raw({type: 'image/jpeg', limit: "50mb"}));
    app.use(bodyParser.raw({type: 'image/png', limit: "50mb"}));
    app.use(bodyParser.raw({type: 'image/gif', limit: "50mb"}));

    // DEBUG (you can remove these)
    app.use((req, res, next) => {
        Logger.http(`##### ${req.method} ${req.path} #####`);
        next();
    });

    app.get('/', (req, res) =>{
        res.send({ 'message': 'Hello World!' })
    });

    // ROUTES
    require('../app/routes/backdoor.routes')(app);
    require('../app/routes/users.routes')(app);
    require('../app/routes/auctions.routes')(app);
    return app;

};
